import React, { useCallback, useState, useMemo, useRef, useEffect } from "react";
import { useKey } from "react-use";
import "./ConfirmationBox.css";
import {
  USD_DECIMALS,
  PRECISION,
  BASIS_POINTS_DIVISOR,
  LIMIT,
  MIN_PROFIT_TIME,
  INCREASE,
  getExchangeRate,
  getExchangeRateDisplay,
  DEFAULT_SLIPPAGE_AMOUNT,
  DEFAULT_HIGHER_SLIPPAGE_AMOUNT,
  calculatePositionDelta,
  DECREASE,
} from "lib/legacy";

import Modal from "../Modal/Modal";
import Button from "components/Button/Button";

export default function ConfirmationBox(props) {
  const {
    fromToken,
    fromTokenInfo,
    toToken,
    toTokenInfo,
    isSwap,
    isLong,
    isMarketOrder,
    orderOption,
    isShort,
    toAmount,
    fromAmount,
    isHigherSlippageAllowed,
    onConfirmationClick,
    setIsConfirming,
    hasExistingPosition,
    leverage,
    existingPosition,
    existingLiquidationPrice,
    displayLiquidationPrice,
    shortCollateralToken,
    isPendingConfirmation,
    triggerPriceUsd,
    triggerRatio,
    feesUsd,
    isSubmitting,
    fromUsdMin,
    toUsdMax,
    nextAveragePrice,
    collateralTokenAddress,
    feeBps,
    chainId,
    orders,
    library,
    setPendingTxns,
    pendingTxns,
    minExecutionFee,
    minExecutionFeeUSD,
    minExecutionFeeErrorMessage,
    entryMarkPrice,
    positionFee,
    swapFees,
    infoTokens,
    fundingRate,
    borrowFeeText,
  } = props;

  const existingTriggerOrders = useMemo(() => {
    const wrappedToken = getWrappedToken(chainId);
    return orders.filter((order) => {
      if (order.type !== DECREASE) return false;
      const sameToken =
        order.indexToken === wrappedToken.address ? toToken.isNative : order.indexToken === toToken.address;
      return order.isLong === isLong && sameToken;
    });
  }, [orders, chainId, isLong, toToken.address, toToken.isNative]);

  const decreaseOrdersThatWillBeExecuted = useMemo(() => {
    if (isSwap) return [];
    return existingTriggerOrders.filter((order) => {
      if (order.triggerAboveThreshold) {
        return existingPosition?.markPrice.gte(order.triggerPrice);
      } else {
        return existingPosition?.markPrice.lte(order.triggerPrice);
      }
    });
  }, [existingPosition, existingTriggerOrders, isSwap]);

  const getPrimaryText = () => {
    if (decreaseOrdersThatWillBeExecuted.length > 0 && !isTriggerWarningAccepted) {
      return t`Accept confirmation of trigger orders`;
    }

    if (!isPendingConfirmation) {
      const error = getError();
      if (error) {
        return error;
      }

      if (isSwap) {
        return title;
      }
      const action = isLong ? t`Long` : t`Short`;

      if (
        isMarketOrder &&
        MIN_PROFIT_TIME > 0 &&
        hasExistingPosition &&
        existingPosition.delta.eq(0) &&
        existingPosition.pendingDelta.gt(0)
      ) {
        return isLong ? t`Forfeit profit and ${action}` : t`Forfeit profit and Short`;
      }

      return isMarketOrder && MIN_PROFIT_TIME > 0 ? t`Accept minimum and ${action}` : action;
    }

    if (!isMarketOrder) {
      return t`Creating Order...`;
    }
    if (isSwap) {
      return t`Swapping...`;
    }
    if (isLong) {
      return t`Longing...`;
    }
    return t`Shorting...`;
  };

  const isPrimaryEnabled = () => {
    if (getError()) {
      return false;
    }
    if (decreaseOrdersThatWillBeExecuted.length > 0 && !isTriggerWarningAccepted) {
      return false;
    }
    return !isPendingConfirmation && !isSubmitting;
  };

  const getError = () => {
    if (!isSwap && hasExistingPosition && !isMarketOrder) {
      const { delta, hasProfit } = calculatePositionDelta(triggerPriceUsd, existingPosition);
      if (hasProfit && delta.eq(0)) {
        return t`Invalid price, see warning`;
      }
    }
    if (isMarketOrder && hasPendingProfit && !isProfitWarningAccepted) {
      return t`Forfeit profit not checked`;
    }
    return false;
  };

  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const spreadInfo = getSwapSpreadInfo(fromTokenInfo, toTokenInfo, isLong, nativeTokenAddress);

  // it's meaningless for limit/stop orders to show spread based on current prices
  const showSwapSpread = isSwap && isMarketOrder && !!spreadInfo;

  const renderSwapSpreadWarning = useCallback(() => {
    if (!isMarketOrder) {
      return null;
    }

    if (spreadInfo && spreadInfo.isHigh) {
      return (
        <div className="Confirmation-box-warning">
          <Trans>The spread is {`>`} 1%, please ensure the trade details are acceptable before confirming</Trans>
        </div>
      );
    }
  }, [isMarketOrder, spreadInfo]);

  const collateralSpreadInfo = useMemo(() => {
    if (!toTokenInfo?.spread || !collateralTokenAddress) {
      return null;
    }

    let totalSpread = toTokenInfo.spread;
    if (toTokenInfo.address === collateralTokenAddress) {
      return {
        value: totalSpread,
        isHigh: toTokenInfo.spread.gt(HIGH_SPREAD_THRESHOLD),
      };
    }

    const collateralTokenInfo = getTokenInfo(infoTokens, collateralTokenAddress);
    if (collateralTokenInfo?.spread) {
      totalSpread = totalSpread.add(collateralTokenInfo.spread);
    }

    return {
      value: totalSpread,
      isHigh: totalSpread.gt(HIGH_SPREAD_THRESHOLD),
    };
  }, [toTokenInfo, collateralTokenAddress, infoTokens]);

  const renderCollateralSpreadWarning = useCallback(() => {
    if (collateralSpreadInfo && collateralSpreadInfo.isHigh) {
      return (
        <div className="Confirmation-box-warning">
          <Trans>
            Transacting with a depegged stable coin is subject to spreads reflecting the worse of current market price
            or $1.00, with transactions involving multiple stablecoins may have multiple spreads.
          </Trans>
        </div>
      );
    }
  }, [collateralSpreadInfo]);


  return (
    <div className="Confirmation-box">
      <Modal isVisible={true} setIsVisible={() => setIsConfirming(false)} label={title}>
        <div className="Confirmation-box-row" ref={submitButtonRef}>
          <Button
            variant={
              textButton.includes("Long")
                ? "long-action"
                : textButton.includes("Short")
                ? "short-action"
                : "brand-action"
            }
            onClick={onConfirmationClick}
            className="w-full mt-sm"
            disabled={!isPrimaryEnabled()}
            type="submit"
          >
            {getPrimaryText()}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
