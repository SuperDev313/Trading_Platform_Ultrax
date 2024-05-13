/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import Tooltip from "../Tooltip/Tooltip";
import { t, Trans } from "@lingui/macro";
import "./SwapBox.scss";

import useSWR from "swr";
import { ethers } from "ethers";

import { IoMdSwap } from "react-icons/io";
import { BsArrowRight } from "react-icons/bs";

import {
  adjustForDecimals,
  BASIS_POINTS_DIVISOR,
  calculatePositionDelta,
  DEFAULT_HIGHER_SLIPPAGE_AMOUNT,
  DUST_BNB,
  getExchangeRate,
  getExchangeRateDisplay,
  getLeverage,
  getLiquidationPrice,
  getNextFromAmount,
  getNextToAmount,
  getPositionKey,
  isTriggerRatioInverted,
  LEVERAGE_ORDER_OPTIONS,
  LIMIT,
  LONG,
  MARGIN_FEE_BASIS_POINTS,
  MARKET,
  PRECISION,
  SHORT,
  STOP,
  SWAP,
  SWAP_OPTIONS,
  SWAP_ORDER_OPTIONS,
  USD_DECIMALS,
  USDG_ADDRESS,
  USDG_DECIMALS,
  MAX_ALLOWED_LEVERAGE,
} from "lib/legacy";
import { ARBITRUM, getChainName, getConstant, IS_NETWORK_DISABLED, isSupportedChain } from "config/chains";
import * as Api from "domain/legacy";
import { getContract } from "config/contracts";

import Tab from "../Tab/Tab";
import TokenSelector from "./TokenSelector";
import ExchangeInfoRow from "./ExchangeInfoRow";
import ConfirmationBox from "./ConfirmationBox";
import OrdersToa from "./OrdersToa";

import PositionRouter from "abis/PositionRouter.json";
import Router from "abis/Router.json";
import Token from "abis/Token.json";
import WETH from "abis/WETH.json";

import longImg from "img/long.svg";
import longActiveImg from "img/long_active.svg";
import shortImg from "img/short.svg";
import shortActiveImg from "img/short_active.svg";
import swapImg from "img/swap.svg";
import swapActiveImg from "img/swap_active.svg";

import NoLiquidityErrorModal from "./NoLiquidityErrorModal";
import StatsTooltipRow from "../StatsTooltip/StatsTooltipRow";
import { callContract, contractFetcher } from "lib/contracts";
import {
  approveTokens,
  getMostAbundantStableToken,
  replaceNativeTokenAddress,
  shouldRaiseGasError,
} from "domain/tokens";
import { useLocalStorageByChainId, useLocalStorageSerializeKey } from "lib/localStorage";
import { helperToast } from "lib/helperToast";
import { getTokenInfo, getUsd } from "domain/tokens/utils";
import { usePrevious } from "lib/usePrevious";
import { bigNumberify, expandDecimals, formatAmount, formatAmountFree, parseValue } from "lib/numbers";
import { getToken, getTokenBySymbol, getTokens, getWhitelistedTokens } from "config/tokens";
import ExternalLink from "components/ExternalLink/ExternalLink";
import { ErrorCode, ErrorDisplayType } from "./constants";
import Button from "components/Button/Button";
import UsefulLinks from "./UsefulLinks";
import { get1InchSwapUrl } from "config/links";
import ToggleSwitch from "components/ToggleSwitch/ToggleSwitch";
import LeverageSlider from "./LeverageSlider";
import BuyInputSection from "components/BuyInputSection/BuyInputSection";
import FeesTooltip from "./FeesTooltip";

const SWAP_ICONS = {
  [LONG]: longImg,
  [SHORT]: shortImg,
  [SWAP]: swapImg,
  [LONG + "_active"]: longActiveImg,
  [SHORT + "_active"]: shortActiveImg,
  [SWAP + "_active"]: swapActiveImg,
};

const { AddressZero } = ethers.constants;

function getNextAveragePrice({ size, sizeDelta, hasProfit, delta, nextPrice, isLong }) {
  if (!size || !sizeDelta || !delta || !nextPrice) {
    return;
  }
  const nextSize = size.add(sizeDelta);
  let divisor;
  if (isLong) {
    divisor = hasProfit ? nextSize.add(delta) : nextSize.sub(delta);
  } else {
    divisor = hasProfit ? nextSize.sub(delta) : nextSize.add(delta);
  }
  if (!divisor || divisor.eq(0)) {
    return;
  }
  const nextAveragePrice = nextPrice.mul(nextSize).div(divisor);
  return nextAveragePrice;
}

export default function SwapBox(props) {
  const {
    pendingPositions,
    setPendingPositions,
    infoTokens,
    active,
    library,
    account,
    fromTokenAddress,
    setFromTokenAddress,
    toTokenAddress,
    setToTokenAddress,
    swapOption,
    setSwapOption,
    positionsMap,
    pendingTxns,
    setPendingTxns,
    tokenSelection,
    setTokenSelection,
    setIsConfirming,
    isConfirming,
    isPendingConfirmation,
    setIsPendingConfirmation,
    flagOrdersEnabled,
    chainId,
    nativeTokenAddress,
    savedSlippageAmount,
    totalTokenWeights,
    usdgSupply,
    orders,
    savedIsPnlInLeverage,
    orderBookApproved,
    positionRouterApproved,
    isWaitingForPluginApproval,
    approveOrderBook,
    approvePositionRouter,
    setIsWaitingForPluginApproval,
    isWaitingForPositionRouterApproval,
    setIsWaitingForPositionRouterApproval,
    isPluginApproving,
    isPositionRouterApproving,
    savedShouldDisableValidationForTesting,
    minExecutionFee,
    minExecutionFeeUSD,
    minExecutionFeeErrorMessage,
  } = props;
  const [fromValue, setFromValue] = useState("");
  const [toValue, setToValue] = useState("");
  const [anchorOnFromAmount, setAnchorOnFromAmount] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [isWaitingForApproval, setIsWaitingForApproval] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState(false);
  const [isHigherSlippageAllowed, setIsHigherSlippageAllowed] = useState(false);

  let allowedSlippage = savedSlippageAmount;
  if (isHigherSlippageAllowed) {
    allowedSlippage = DEFAULT_HIGHER_SLIPPAGE_AMOUNT;
  }

  const defaultCollateralSymbol = getConstant(chainId, "defaultCollateralSymbol");
  const [shortCollateralAddress, setShortCollateralAddress] = useLocalStorageByChainId(
    chainId,
    "Short-Collateral-Address",
    getTokenBySymbol(chainId, defaultCollateralSymbol).address
  );
  const isLong = swapOption === LONG;
  const isShort = swapOption === SHORT;
  const isSwap = swapOption === SWAP;

  function getTokenLabel() {
    switch (true) {
      case isLong:
        return t`Long`;
      case isShort:
        return t`Short`;
      case isSwap:
        return t`Receive`;
      default:
        return "";
    }
  }

  const [leverageOption, setLeverageOption] = useLocalStorageSerializeKey(
    [chainId, "Exchange-swap-leverage-option"],
    "2"
  );
  const [isLeverageSliderEnabled, setIsLeverageSliderEnabled] = useLocalStorageSerializeKey(
    [chainId, "Exchange-swap-leverage-slider-enabled"],
    true
  );

  const hasLeverageOption = isLeverageSliderEnabled && !isNaN(parseFloat(leverageOption));

  const [ordersToaOpen, setOrdersToaOpen] = useState(false);

  let [orderOption, setOrderOption] = useLocalStorageSerializeKey([chainId, "Order-option"], MARKET);
  if (!flagOrdersEnabled) {
    orderOption = MARKET;
  }

  const onOrderOptionChange = (option) => {
    setOrderOption(option);
  };
  const isMarketOrder = orderOption === MARKET;
  const orderOptions = isSwap ? SWAP_ORDER_OPTIONS : LEVERAGE_ORDER_OPTIONS;
  const orderOptionLabels = { [STOP]: t`Trigger`, [MARKET]: t`Market`, [LIMIT]: t`Limit` };

  const [triggerPriceValue, setTriggerPriceValue] = useState("");
  const triggerPriceUsd = isMarketOrder ? 0 : parseValue(triggerPriceValue, USD_DECIMALS);

  const onTriggerPriceChange = (evt) => {
    setTriggerPriceValue(evt.target.value || "");
  };

  const onTriggerRatioChange = (evt) => {
    setTriggerRatioValue(evt.target.value || "");
  };

  const renderAvailableLongLiquidity = () => {
    if (!isLong) {
      return null;
    }

    return (
      <div className="Exchange-info-row">
        <div className="Exchange-info-label">
          <Trans>Available Liquidity</Trans>
        </div>
        <div className="align-right text-primary">
          <Tooltip
            handle={`$${formatAmount(toTokenInfo.maxAvailableLong, USD_DECIMALS, 2, true)}`}
            position="right-bottom"
            renderContent={() => {
              return (
                <>
                  <StatsTooltipRow
                    label={t`Max ${toTokenInfo.symbol} long capacity`}
                    value={formatAmount(toTokenInfo.maxLongCapacity, USD_DECIMALS, 0, true)}
                  />
                  <StatsTooltipRow
                    label={t`Current ${toTokenInfo.symbol} long`}
                    value={formatAmount(toTokenInfo.guaranteedUsd, USD_DECIMALS, 0, true)}
                  />
                </>
              );
            }}
          ></Tooltip>
        </div>
      </div>
    );
  };

  const fromUsdMin = getUsd(fromAmount, fromTokenAddress, false, infoTokens);
  const toUsdMax = getUsd(toAmount, toTokenAddress, true, infoTokens, orderOption, triggerPriceUsd);

  const fromToken = getToken(chainId, fromTokenAddress);
  const toToken = getToken(chainId, toTokenAddress);
  const shortCollateralToken = getTokenInfo(infoTokens, shortCollateralAddress);

  const fromTokenInfo = getTokenInfo(infoTokens, fromTokenAddress);
  const toTokenInfo = getTokenInfo(infoTokens, toTokenAddress);

  const indexTokenAddress = toTokenAddress === AddressZero ? nativeTokenAddress : toTokenAddress;
  const collateralTokenAddress = isLong ? indexTokenAddress : shortCollateralAddress;
  const collateralToken = getToken(chainId, collateralTokenAddress);

  const [triggerRatioValue, setTriggerRatioValue] = useState("");

  const triggerRatioInverted = useMemo(() => {
    return isTriggerRatioInverted(fromTokenInfo, toTokenInfo);
  }, [toTokenInfo, fromTokenInfo]);

  const maxToTokenOutUSD = useMemo(() => {
    return getUsd(maxToTokenOut, toTokenAddress, false, infoTokens);
  }, [maxToTokenOut, toTokenAddress, infoTokens]);

  const maxToTokenOut = useMemo(() => {
    const value = toTokenInfo.availableAmount?.gt(toTokenInfo.poolAmount?.sub(toTokenInfo.bufferAmount))
      ? toTokenInfo.poolAmount?.sub(toTokenInfo.bufferAmount)
      : toTokenInfo.availableAmount;

    if (!value) {
      return bigNumberify(0);
    }

    return value.gt(0) ? value : bigNumberify(0);
  }, [toTokenInfo]);

  const maxFromTokenInUSD = useMemo(() => {
    const value = fromTokenInfo.maxUsdgAmount
      ?.sub(fromTokenInfo.usdgAmount)
      .mul(expandDecimals(1, USD_DECIMALS))
      .div(expandDecimals(1, USDG_DECIMALS));

    if (!value) {
      return bigNumberify(0);
    }

    return value.gt(0) ? value : bigNumberify(0);
  }, [fromTokenInfo]);

  const maxFromTokenIn = useMemo(() => {
    if (!fromTokenInfo.maxPrice) {
      return bigNumberify(0);
    }
    return maxFromTokenInUSD?.mul(expandDecimals(1, fromTokenInfo.decimals)).div(fromTokenInfo.maxPrice).toString();
  }, [maxFromTokenInUSD, fromTokenInfo]);

  let maxSwapAmountUsd = bigNumberify(0);

  if (maxToTokenOutUSD && maxFromTokenInUSD) {
    maxSwapAmountUsd = maxToTokenOutUSD.lt(maxFromTokenInUSD) ? maxToTokenOutUSD : maxFromTokenInUSD;
  }

  const triggerRatio = useMemo(() => {
    if (!triggerRatioValue) {
      return bigNumberify(0);
    }
    let ratio = parseValue(triggerRatioValue, USD_DECIMALS);
    if (ratio.eq(0)) {
      return bigNumberify(0);
    }
    if (triggerRatioInverted) {
      ratio = PRECISION.mul(PRECISION).div(ratio);
    }
    return ratio;
  }, [triggerRatioValue, triggerRatioInverted]);

  useEffect(() => {
    if (
      fromToken &&
      fromTokenAddress === prevFromTokenAddress &&
      !needApproval &&
      prevNeedApproval &&
      isWaitingForApproval
    ) {
      setIsWaitingForApproval(false);
      helperToast.success(<div>{fromToken.symbol} approved!</div>);
    }
  }, [
    fromTokenAddress,
    prevFromTokenAddress,
    needApproval,
    prevNeedApproval,
    setIsWaitingForApproval,
    fromToken.symbol,
    isWaitingForApproval,
    fromToken,
  ]);

  useEffect(() => {
    if (swapOption !== SHORT) {
      return;
    }
    if (toTokenAddress === prevToTokenAddress) {
      return;
    }
    for (let i = 0; i < stableTokens.length; i++) {
      const stableToken = stableTokens[i];
      const key = getPositionKey(account, stableToken.address, toTokenAddress, false, nativeTokenAddress);
      const position = positionsMap[key];
      if (position && position.size && position.size.gt(0)) {
        setShortCollateralAddress(position.collateralToken.address);
        return;
      }
    }
  }, [
    account,
    toTokenAddress,
    prevToTokenAddress,
    swapOption,
    positionsMap,
    stableTokens,
    nativeTokenAddress,
    shortCollateralAddress,
    setShortCollateralAddress,
  ]);

  useEffect(() => {
    const updateSwapAmounts = () => {
      if (anchorOnFromAmount) {
        if (!fromAmount) {
          setToValue("");
          return;
        }
        if (toToken) {
          const { amount: nextToAmount } = getNextToAmount(
            chainId,
            fromAmount,
            fromTokenAddress,
            toTokenAddress,
            infoTokens,
            undefined,
            !isMarketOrder && triggerRatio,
            usdgSupply,
            totalTokenWeights,
            isSwap
          );

          const nextToValue = formatAmountFree(nextToAmount, toToken.decimals, toToken.decimals);
          setToValue(nextToValue);
        }
        return;
      }

      if (!toAmount) {
        setFromValue("");
        return;
      }
      if (fromToken) {
        const { amount: nextFromAmount } = getNextFromAmount(
          chainId,
          toAmount,
          fromTokenAddress,
          toTokenAddress,
          infoTokens,
          undefined,
          !isMarketOrder && triggerRatio,
          usdgSupply,
          totalTokenWeights,
          isSwap
        );
        const nextFromValue = formatAmountFree(nextFromAmount, fromToken.decimals, fromToken.decimals);
        setFromValue(nextFromValue);
      }
    };

    const updateLeverageAmounts = () => {
      if (!hasLeverageOption) {
        return;
      }
      if (anchorOnFromAmount) {
        if (!fromAmount) {
          setToValue("");
          return;
        }

        const toTokenInfo = getTokenInfo(infoTokens, toTokenAddress);
        if (toTokenInfo && toTokenInfo.maxPrice && fromUsdMin && fromUsdMin.gt(0)) {
          const leverageMultiplier = parseInt(leverageOption * BASIS_POINTS_DIVISOR);
          const toTokenPriceUsd =
            !isMarketOrder && triggerPriceUsd && triggerPriceUsd.gt(0) ? triggerPriceUsd : toTokenInfo.maxPrice;

          const { feeBasisPoints } = getNextToAmount(
            chainId,
            fromAmount,
            fromTokenAddress,
            collateralTokenAddress,
            infoTokens,
            undefined,
            undefined,
            usdgSupply,
            totalTokenWeights,
            isSwap
          );

          let fromUsdMinAfterFee = fromUsdMin;
          if (feeBasisPoints) {
            fromUsdMinAfterFee = fromUsdMin.mul(BASIS_POINTS_DIVISOR - feeBasisPoints).div(BASIS_POINTS_DIVISOR);
          }

          const toNumerator = fromUsdMinAfterFee.mul(leverageMultiplier).mul(BASIS_POINTS_DIVISOR);
          const toDenominator = bigNumberify(MARGIN_FEE_BASIS_POINTS)
            .mul(leverageMultiplier)
            .add(bigNumberify(BASIS_POINTS_DIVISOR).mul(BASIS_POINTS_DIVISOR));

          const nextToUsd = toNumerator.div(toDenominator);

          const nextToAmount = nextToUsd.mul(expandDecimals(1, toToken.decimals)).div(toTokenPriceUsd);

          const nextToValue = formatAmountFree(nextToAmount, toToken.decimals, toToken.decimals);

          setToValue(nextToValue);
        }
        return;
      }

      if (!toAmount) {
        setFromValue("");
        return;
      }

      const fromTokenInfo = getTokenInfo(infoTokens, fromTokenAddress);
      if (fromTokenInfo && fromTokenInfo.minPrice && toUsdMax && toUsdMax.gt(0)) {
        const leverageMultiplier = parseInt(leverageOption * BASIS_POINTS_DIVISOR);

        const baseFromAmountUsd = toUsdMax.mul(BASIS_POINTS_DIVISOR).div(leverageMultiplier);

        let fees = toUsdMax.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR);

        const { feeBasisPoints } = getNextToAmount(
          chainId,
          fromAmount,
          fromTokenAddress,
          collateralTokenAddress,
          infoTokens,
          undefined,
          undefined,
          usdgSupply,
          totalTokenWeights,
          isSwap
        );

        if (feeBasisPoints) {
          const swapFees = baseFromAmountUsd.mul(feeBasisPoints).div(BASIS_POINTS_DIVISOR);
          fees = fees.add(swapFees);
        }

        const nextFromUsd = baseFromAmountUsd.add(fees);

        const nextFromAmount = nextFromUsd.mul(expandDecimals(1, fromToken.decimals)).div(fromTokenInfo.minPrice);

        const nextFromValue = formatAmountFree(nextFromAmount, fromToken.decimals, fromToken.decimals);

        setFromValue(nextFromValue);
      }
    };

    if (isSwap) {
      updateSwapAmounts();
    }

    if (isLong || isShort) {
      updateLeverageAmounts();
    }
  }, [
    anchorOnFromAmount,
    fromAmount,
    toAmount,
    fromToken,
    toToken,
    fromTokenAddress,
    toTokenAddress,
    infoTokens,
    isSwap,
    isLong,
    isShort,
    leverageOption,
    fromUsdMin,
    toUsdMax,
    isMarketOrder,
    triggerPriceUsd,
    triggerRatio,
    hasLeverageOption,
    usdgSupply,
    totalTokenWeights,
    chainId,
    collateralTokenAddress,
    indexTokenAddress,
  ]);

  let entryMarkPrice;
  let exitMarkPrice;
  if (toTokenInfo) {
    entryMarkPrice = swapOption === LONG ? toTokenInfo.maxPrice : toTokenInfo.minPrice;
    exitMarkPrice = swapOption === LONG ? toTokenInfo.minPrice : toTokenInfo.maxPrice;
  }

  let leverage = bigNumberify(0);
  if (fromUsdMin && toUsdMax && fromUsdMin.gt(0)) {
    const fees = toUsdMax.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR);
    if (fromUsdMin.sub(fees).gt(0)) {
      leverage = toUsdMax.mul(BASIS_POINTS_DIVISOR).div(fromUsdMin.sub(fees));
    }
  }

  let nextAveragePrice = isMarketOrder ? entryMarkPrice : triggerPriceUsd;
  if (hasExistingPosition) {
    let nextDelta, nextHasProfit;

    if (isMarketOrder) {
      nextDelta = existingPosition.delta;
      nextHasProfit = existingPosition.hasProfit;
    } else {
      const data = calculatePositionDelta(triggerPriceUsd || bigNumberify(0), existingPosition);
      nextDelta = data.delta;
      nextHasProfit = data.hasProfit;
    }

    nextAveragePrice = getNextAveragePrice({
      size: existingPosition.size,
      sizeDelta: toUsdMax,
      hasProfit: nextHasProfit,
      delta: nextDelta,
      nextPrice: isMarketOrder ? entryMarkPrice : triggerPriceUsd,
      isLong,
    });
  }

  const liquidationPrice = getLiquidationPrice({
    isLong,
    size: hasExistingPosition ? existingPosition.size : bigNumberify(0),
    collateral: hasExistingPosition ? existingPosition.collateral : bigNumberify(0),
    averagePrice: nextAveragePrice,
    entryFundingRate: hasExistingPosition ? existingPosition.entryFundingRate : bigNumberify(0),
    cumulativeFundingRate: hasExistingPosition ? existingPosition.cumulativeFundingRate : bigNumberify(0),
    sizeDelta: toUsdMax,
    collateralDelta: fromUsdMin,
    increaseCollateral: true,
    increaseSize: true,
  });

  const existingLiquidationPrice = existingPosition ? getLiquidationPrice(existingPosition) : undefined;
  let displayLiquidationPrice = liquidationPrice ? liquidationPrice : existingLiquidationPrice;

  if (hasExistingPosition) {
    const collateralDelta = fromUsdMin ? fromUsdMin : bigNumberify(0);
    const sizeDelta = toUsdMax ? toUsdMax : bigNumberify(0);
    leverage = getLeverage({
      size: existingPosition.size,
      sizeDelta,
      collateral: existingPosition.collateral,
      collateralDelta,
      increaseCollateral: true,
      entryFundingRate: existingPosition.entryFundingRate,
      cumulativeFundingRate: existingPosition.cumulativeFundingRate,
      increaseSize: true,
      hasProfit: existingPosition.hasProfit,
      delta: existingPosition.delta,
      includeDelta: savedIsPnlInLeverage,
    });
  } else if (hasLeverageOption) {
    leverage = bigNumberify(parseInt(leverageOption * BASIS_POINTS_DIVISOR));
  }

  const getSwapError = () => {
    if (IS_NETWORK_DISABLED[chainId]) {
      return [t`Swaps disabled, pending ${getChainName(chainId)} upgrade`];
    }

    if (fromTokenAddress === toTokenAddress) {
      return [t`Select different tokens`];
    }

    if (!isMarketOrder) {
      if ((toToken.isStable || toToken.isUsdg) && (fromToken.isStable || fromToken.isUsdg)) {
        return [t`Select different tokens`];
      }

      if (fromToken.isNative && toToken.isWrapped) {
        return [t`Select different tokens`];
      }

      if (toToken.isNative && fromToken.isWrapped) {
        return [t`Select different tokens`];
      }
    }

    if (!fromAmount || fromAmount.eq(0)) {
      return [t`Enter an amount`];
    }
    if (!toAmount || toAmount.eq(0)) {
      return [t`Enter an amount`];
    }

    const fromTokenInfo = getTokenInfo(infoTokens, fromTokenAddress);
    if (!fromTokenInfo || !fromTokenInfo.minPrice) {
      return [t`Incorrect network`];
    }
    if (
      !savedShouldDisableValidationForTesting &&
      fromTokenInfo &&
      fromTokenInfo.balance &&
      fromAmount &&
      fromAmount.gt(fromTokenInfo.balance)
    ) {
      return [t`Insufficient ${fromTokenInfo.symbol} balance`];
    }

    const toTokenInfo = getTokenInfo(infoTokens, toTokenAddress);

    if (!isMarketOrder) {
      if (!triggerRatioValue || triggerRatio.eq(0)) {
        return [t`Enter a price`];
      }

      const currentRate = getExchangeRate(fromTokenInfo, toTokenInfo);
      if (currentRate && currentRate.lt(triggerRatio)) {
        return triggerRatioInverted ? [t`Price below Mark Price`] : [t`Price above Mark Price`];
      }
    }

    if (
      !isWrapOrUnwrap &&
      toToken &&
      toTokenAddress !== USDG_ADDRESS &&
      toTokenInfo &&
      toTokenInfo.availableAmount &&
      toAmount.gt(toTokenInfo.availableAmount)
    ) {
      return [t`Insufficient Liquidity`];
    }
    if (
      !isWrapOrUnwrap &&
      toAmount &&
      toTokenInfo.bufferAmount &&
      toTokenInfo.poolAmount &&
      toTokenInfo.bufferAmount.gt(toTokenInfo.poolAmount.sub(toAmount))
    ) {
      return [t`Insufficient Liquidity`];
    }

    if (
      fromUsdMin &&
      fromTokenInfo.maxUsdgAmount &&
      fromTokenInfo.maxUsdgAmount.gt(0) &&
      fromTokenInfo.usdgAmount &&
      fromTokenInfo.maxPrice
    ) {
      const usdgFromAmount = adjustForDecimals(fromUsdMin, USD_DECIMALS, USDG_DECIMALS);
      const nextUsdgAmount = fromTokenInfo.usdgAmount.add(usdgFromAmount);

      if (nextUsdgAmount.gt(fromTokenInfo.maxUsdgAmount)) {
        return [t`Insufficient liquidity`, ErrorDisplayType.Tooltip, ErrorCode.InsufficientLiquiditySwap];
      }
    }

    return [false];
  };

  return (
    <div className="Exchange-swap-box">
      <div className="Exchange-swap-info-group">
        {isSwap && (
          <div className="Exchange-swap-market-box App-box App-box-border">
            <div className="Exchange-swap-market-box-title">
              <Trans>Swap</Trans>
            </div>
            {/* <div className="App-card-divider"></div> */}
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>{fromToken.symbol} Price</Trans>
              </div>
              <div className="align-right text-primary">
                ${fromTokenInfo && formatAmount(fromTokenInfo.minPrice, USD_DECIMALS, 2, true)}
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>{toToken.symbol} Price</Trans>
              </div>
              <div className="align-right text-primary">
                ${toTokenInfo && formatAmount(toTokenInfo.maxPrice, USD_DECIMALS, 2, true)}
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Available Liquidity</Trans>
              </div>

              <div className="align-right al-swap">
                <Tooltip
                  handle={`$${formatAmount(maxSwapAmountUsd, USD_DECIMALS, 2, true)}`}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <div>
                        <StatsTooltipRow
                          label={t`Max ${fromTokenInfo.symbol} in`}
                          value={[
                            `${formatAmount(maxFromTokenIn, fromTokenInfo.decimals, 0, true)} ${fromTokenInfo.symbol}`,
                            `($${formatAmount(maxFromTokenInUSD, USD_DECIMALS, 0, true)})`,
                          ]}
                        />
                        <StatsTooltipRow
                          label={t`Max ${toTokenInfo.symbol} out`}
                          value={[
                            `${formatAmount(maxToTokenOut, toTokenInfo.decimals, 0, true)} ${toTokenInfo.symbol}`,
                            `($${formatAmount(maxToTokenOutUSD, USD_DECIMALS, 0, true)})`,
                          ]}
                        />
                      </div>
                    );
                  }}
                />
              </div>
            </div>
            {!isMarketOrder && (
              <ExchangeInfoRow label={t`Price`}>
                {getExchangeRateDisplay(getExchangeRate(fromTokenInfo, toTokenInfo), fromToken, toToken)}
              </ExchangeInfoRow>
            )}
          </div>
        )}
        {(isLong || isShort) && (
          <div className="Exchange-swap-market-box App-box App-box-border">
            <div className="Exchange-swap-market-box-title">
              {isLong ? t`Long` : t`Short`}&nbsp;{toToken.symbol}
            </div>
            {/* <div className="App-card-divider" /> */}
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Entry Price</Trans>
              </div>
              <div className="align-right text-primary">
                <Tooltip
                  handle={`$${formatAmount(entryMarkPrice, USD_DECIMALS, 2, true)}`}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <div>
                        <Trans>
                          The position will be opened at {formatAmount(entryMarkPrice, USD_DECIMALS, 2, true)} USD with
                          a max slippage of {parseFloat(savedSlippageAmount / 100.0).toFixed(2)}%.
                          <br />
                          <br />
                          The slippage amount can be configured under Settings, found by clicking on your address at the
                          top right of the page after connecting your wallet.
                          <br />
                          <br />
                          {/* TODO: ADD LINK DOCS */}
                          <ExternalLink href="">More Info</ExternalLink>
                        </Trans>
                      </div>
                    );
                  }}
                />
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Exit Price</Trans>
              </div>
              <div className="align-right text-primary">
                <Tooltip
                  handle={`$${formatAmount(exitMarkPrice, USD_DECIMALS, 2, true)}`}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <div>
                        <Trans>
                          If you have an existing position, the position will be closed at{" "}
                          {formatAmount(entryMarkPrice, USD_DECIMALS, 2, true)} USD.
                          <br />
                          <br />
                          This exit price will change with the price of the asset.
                          <br />
                          <br />
                          <ExternalLink href="">More Info</ExternalLink>
                        </Trans>
                      </div>
                    );
                  }}
                />
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Borrow Fee</Trans>
              </div>
              <div className="align-right text-primary">
                <Tooltip
                  handle={borrowFeeText}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <div>
                        {hasZeroBorrowFee && (
                          <div>
                            {isLong && t`There are more shorts than longs, borrow fees for longing is currently zero`}
                            {isShort && t`There are more longs than shorts, borrow fees for shorting is currently zero`}
                          </div>
                        )}
                        {!hasZeroBorrowFee && (
                          <div>
                            <Trans>
                              The borrow fee is calculated as (assets borrowed) / (total assets in pool) * 0.01% per
                              hour.
                            </Trans>
                            <br />
                            <br />
                            {isShort && t`You can change the "Collateral In" token above to find lower fees`}
                          </div>
                        )}
                        <br />
                        <ExternalLink href="">
                          <Trans>More Info</Trans>
                        </ExternalLink>
                      </div>
                    );
                  }}
                >
                  {!hasZeroBorrowFee && null}
                </Tooltip>
              </div>
            </div>
            {renderAvailableLongLiquidity()}
            {isShort && toTokenInfo.hasMaxAvailableShort && (
              <div className="Exchange-info-row">
                <div className="Exchange-info-label">
                  <Trans>Available Liquidity</Trans>
                </div>
                <div className="align-right text-primary">
                  <Tooltip
                    handle={`$${formatAmount(toTokenInfo.maxAvailableShort, USD_DECIMALS, 2, true)}`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          <StatsTooltipRow
                            label={t`Max ${toTokenInfo.symbol} short capacity`}
                            value={formatAmount(toTokenInfo.maxGlobalShortSize, USD_DECIMALS, 0, true)}
                          />
                          <StatsTooltipRow
                            label={t`Current ${toTokenInfo.symbol} shorts`}
                            value={formatAmount(toTokenInfo.globalShortSize, USD_DECIMALS, 0, true)}
                          />
                        </>
                      );
                    }}
                  ></Tooltip>
                </div>
              </div>
            )}
          </div>
        )}
        <UsefulLinks className="Useful-links-swapbox" />
      </div>
      <NoLiquidityErrorModal
        chainId={chainId}
        fromToken={fromToken}
        toToken={toToken}
        shortCollateralToken={shortCollateralToken}
        isLong={isLong}
        isShort={isShort}
        modalError={modalError}
        setModalError={setModalError}
      />
    </div>
  );
}
