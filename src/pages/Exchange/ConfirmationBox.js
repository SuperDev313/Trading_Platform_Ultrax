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
