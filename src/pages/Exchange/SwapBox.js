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
