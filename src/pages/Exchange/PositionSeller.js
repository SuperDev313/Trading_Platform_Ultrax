/* eslint-disable no-unused-vars */
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { ethers } from "ethers";
import cx from "classnames";
import { Trans, t } from "@lingui/macro";
import { BsArrowRight } from "react-icons/bs";

import {
  DEFAULT_SLIPPAGE_AMOUNT,
  DEFAULT_HIGHER_SLIPPAGE_AMOUNT,
  USD_DECIMALS,
  DUST_USD,
  BASIS_POINTS_DIVISOR,
  MIN_PROFIT_TIME,
  getLiquidationPrice,
  getLeverage,
  getMarginFee,
  PRECISION,
  MARKET,
  STOP,
  DECREASE,
  calculatePositionDelta,
  getDeltaStr,
  getProfitPrice,
  getNextToAmount,
  USDG_DECIMALS,
  adjustForDecimals,
  isAddressZero,
  MAX_ALLOWED_LEVERAGE,
} from "lib/legacy";
import { ARBITRUM, getChainName, getConstant, IS_NETWORK_DISABLED } from "config/chains";
import { createDecreaseOrder, useHasOutdatedUi } from "domain/legacy";
import { getContract } from "config/contracts";
import PositionRouter from "abis/PositionRouter.json";
import Checkbox from "../Checkbox/Checkbox";
import Tab from "../Tab/Tab";
import Modal from "../Modal/Modal";

import ExchangeInfoRow from "./ExchangeInfoRow";
import Tooltip from "../Tooltip/Tooltip";
import TokenSelector from "./TokenSelector";
import "./PositionSeller.css";
import StatsTooltipRow from "../StatsTooltip/StatsTooltipRow";
import { callContract } from "lib/contracts";
import { getTokenAmountFromUsd } from "domain/tokens";
import { TRIGGER_PREFIX_ABOVE, TRIGGER_PREFIX_BELOW } from "config/ui";
import { useLocalStorageByChainId, useLocalStorageSerializeKey } from "lib/localStorage";
import { CLOSE_POSITION_RECEIVE_TOKEN_KEY, SLIPPAGE_BPS_KEY } from "config/localStorage";
import { getTokenInfo, getUsd } from "domain/tokens/utils";

const { AddressZero } = ethers.constants;
const ORDER_SIZE_DUST_USD = expandDecimals(1, USD_DECIMALS - 1); // $0.10

const HIGH_SPREAD_THRESHOLD = expandDecimals(1, USD_DECIMALS).div(100); // 1%;

function applySpread(amount, spread) {
  if (!amount || !spread) {
    return amount;
  }
  return amount.sub(amount.mul(spread).div(PRECISION));
}

function shouldSwap(amount, receiveToken) {
  const isCollateralWrapped = collateralToken.isNative;

  const isSameToken =
    collateralToken.address === receiveToken.address || (isCollateralWrapped && receiveToken.isWrapped);

  const isUnwrap = isCollateralWrapped && receiveToken.isNative;

  return !isSameToken && !isUnwrap;
}

function getSwapLimits(infoTokens, fromTokenAddress, toTokenAddress) {
  const fromInfo = getTokenInfo(infoTokens, fromTokenAddress);
  const toInfo = getTokenInfo(infoTokens, toTokenAddress);

  let maxInUsd;
  let maxIn;
  let maxOut;
  let maxOutUsd;

  if (!fromInfo?.maxUsdgAmount) {
    maxInUsd = bigNumberify(0);
    maxIn = bigNumberify(0);
  } else {
    maxInUsd = fromInfo.maxUsdgAmount
      .sub(fromInfo.usdgAmount)
      .mul(expandDecimals(1, USD_DECIMALS))
      .div(expandDecimals(1, USDG_DECIMALS));

    maxIn = maxInUsd.mul(expandDecimals(1, fromInfo.decimals)).div(fromInfo.maxPrice).toString();
  }

  if (!toInfo?.poolAmount || !toInfo?.bufferAmount) {
    maxOut = bigNumberify(0);
    maxOutUsd = bigNumberify(0);
  } else {
    maxOut = toInfo.availableAmount.gt(toInfo.poolAmount.sub(toInfo.bufferAmount))
      ? toInfo.poolAmount.sub(toInfo.bufferAmount)
      : toInfo.availableAmount;

    maxOutUsd = getUsd(maxOut, toInfo.address, false, infoTokens);
  }

  return {
    maxIn,
    maxInUsd,
    maxOut,
    maxOutUsd,
  };
}

export default function PositionSeller(props) {
  const {
    pendingPositions,
    setPendingPositions,
    positionsMap,
    positionKey,
    isVisible,
    setIsVisible,
    account,
    library,
    infoTokens,
    setPendingTxns,
    flagOrdersEnabled,
    savedIsPnlInLeverage,
    chainId,
    nativeTokenAddress,
    orders,
    isWaitingForPluginApproval,
    isPluginApproving,
    orderBookApproved,
    setOrdersToaOpen,
    positionRouterApproved,
    isWaitingForPositionRouterApproval,
    isPositionRouterApproving,
    approvePositionRouter,
    isHigherSlippageAllowed,
    minExecutionFee,
    minExecutionFeeErrorMessage,
    usdgSupply,
    totalTokenWeights,
    isContractAccount,
  } = props;

  return (
    <div className="PositionEditor">
      {position && (
        <Modal className="PositionSeller-modal" isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
          {flagOrdersEnabled && (
            <Tab
              options={ORDER_OPTIONS}
              option={orderOption}
              optionLabels={ORDER_OPTION_LABELS}
              onChange={onOrderOptionChange}
            />
          )}
          <div className="Exchange-swap-section">
            <div className="Exchange-swap-section-top">
              <div className="muted">
                {convertedAmountFormatted && (
                  <div className="Exchange-swap-usd">
                    <span className="title-edit-position-muted">Size:&nbsp;</span>
                    <span>
                      {convertedAmountFormatted} {position.collateralToken.symbol}
                    </span>
                  </div>
                )}
                <span className="title-edit-position-muted">{!convertedAmountFormatted && t`Size`}</span>
              </div>
              {maxAmount && (
                <div className="muted align-right clickable" onClick={() => setFromValue(maxAmountFormattedFree)}>
                  <span className="title-edit-position-muted">Max:&nbsp;</span>
                  <span>{maxAmountFormatted}</span>
                </div>
              )}
            </div>
            <div className="Exchange-swap-section-bottom">
              <div className="Exchange-swap-input-container">
                <input
                  type="number"
                  min="0"
                  placeholder="0.0"
                  className="Exchange-swap-input"
                  value={fromValue}
                  onChange={(e) => setFromValue(e.target.value)}
                />
                {fromValue !== maxAmountFormattedFree && (
                  <button
                    className="Exchange-swap-max"
                    onClick={() => {
                      setFromValue(maxAmountFormattedFree);
                    }}
                  >
                    <Trans>MAX</Trans>
                  </button>
                )}
              </div>
              <div className="PositionEditor-token-symbol">USD</div>
            </div>
          </div>
          {orderOption === STOP && (
            <div className="Exchange-swap-section">
              <div className="Exchange-swap-section-top">
                <div className="muted">
                  <span className="title-edit-position-muted">Price</span>
                </div>
                <div
                  className="muted align-right clickable"
                  onClick={() => {
                    setTriggerPriceValue(formatAmountFree(position.markPrice, USD_DECIMALS, 2));
                  }}
                >
                  <span className="title-edit-position-muted">Market:&nbsp;</span>
                  <span>{formatAmount(position.markPrice, USD_DECIMALS, 2, true)}</span>
                </div>
              </div>
              <div className="Exchange-swap-section-bottom">
                <div className="Exchange-swap-input-container">
                  <input
                    type="number"
                    min="0"
                    placeholder="0.0"
                    className="Exchange-swap-input"
                    value={triggerPriceValue}
                    onChange={onTriggerPriceChange}
                  />
                </div>
                <div className="PositionEditor-token-symbol">USD</div>
              </div>
            </div>
          )}
          {renderMinProfitWarning()}
          {shouldShowExistingOrderWarning && renderExistingOrderWarning()}
          <div className="PositionEditor-info-box">
            {minExecutionFeeErrorMessage && (
              <div className="Confirmation-box-warning">{minExecutionFeeErrorMessage}</div>
            )}
            {hasPendingProfit && orderOption !== STOP && (
              <div className="PositionEditor-accept-profit-warning">
                <Checkbox isChecked={isProfitWarningAccepted} setIsChecked={setIsProfitWarningAccepted}>
                  <span className="muted">Forfeit profit</span>
                </Checkbox>
              </div>
            )}

            {orderOption === MARKET && (
              <div>
                <ExchangeInfoRow
                  label={
                    <Tooltip
                      handle={t`Allowed Slippage`}
                      position="left-top"
                      renderContent={() => {
                        return (
                          <div className="text-white">
                            <Trans>
                              You can change this in the settings menu on the top right of the page.
                              <br />
                              <br />
                              Note that a low allowed slippage, e.g. less than 0.5%, may result in failed orders if
                              prices are volatile.
                            </Trans>
                          </div>
                        );
                      }}
                    />
                  }
                >
                  <SlippageInput setAllowedSlippage={setAllowedSlippage} defaultSlippage={savedSlippageAmount} />
                </ExchangeInfoRow>
              </div>
            )}
            {orderOption === STOP && (
              <div className="Exchange-info-row">
                <div className="Exchange-info-label">
                  <Trans>Trigger Price</Trans>
                </div>
                <div className="align-right">
                  {!triggerPriceUsd && "-"}
                  {triggerPriceUsd && `${triggerPricePrefix} $${formatAmount(triggerPriceUsd, USD_DECIMALS, 2, true)}`}
                </div>
              </div>
            )}
            <div className="Exchange-info-row top-line market-price">
              <div className="Exchange-info-label">
                <Trans>Market Price</Trans>
              </div>
              <div className="align-right">${formatAmount(position.markPrice, USD_DECIMALS, 2, true)}</div>
            </div>
            <div className="Exchange-info-row entry-price">
              <div className="Exchange-info-label">
                <Trans>Entry Price</Trans>
              </div>
              <div className="align-right">${formatAmount(position.averagePrice, USD_DECIMALS, 2, true)}</div>
            </div>
            <div className="Exchange-info-row liq-price">
              <div className="Exchange-info-label">
                <Trans>Liq. Price</Trans>
              </div>
              <div className="align-right">
                {isClosing && orderOption !== STOP && "-"}
                {(!isClosing || orderOption === STOP) && (
                  <div>
                    {(!nextLiquidationPrice || nextLiquidationPrice.eq(liquidationPrice)) && (
                      <div>{`$${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}`}</div>
                    )}
                    {nextLiquidationPrice && !nextLiquidationPrice.eq(liquidationPrice) && (
                      <div>
                        <div className="inline-block muted">
                          ${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}
                          <BsArrowRight className="transition-arrow" />
                        </div>
                        ${formatAmount(nextLiquidationPrice, USD_DECIMALS, 2, true)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="Exchange-info-row top-line size">
              <div className="Exchange-info-label">
                <Trans>Size</Trans>
              </div>
              <div className="align-right">
                {position && position.size && fromAmount && (
                  <div>
                    <div className="inline-block muted">
                      <span style={{ color: "#8391A4" }}>${formatAmount(position.size, USD_DECIMALS, 2, true)}</span>
                      <BsArrowRight className="transition-arrow" />
                    </div>
                    ${formatAmount(position.size.sub(fromAmount), USD_DECIMALS, 2, true)}
                  </div>
                )}
                {position && position.size && !fromAmount && (
                  <div>${formatAmount(position.size, USD_DECIMALS, 2, true)}</div>
                )}
              </div>
            </div>
            <div className="Exchange-info-row collateral">
              <div>
                <Tooltip
                  handle={
                    <span className="Exchange-info-label">
                      <Trans>Collateral ({collateralToken.symbol})</Trans>
                    </span>
                  }
                  position="left-top"
                  renderContent={() => {
                    return <Trans>Initial Collateral (Collateral excluding Borrow Fee).</Trans>;
                  }}
                />
              </div>

              <div className="align-right">
                {nextCollateral && !nextCollateral.eq(position.collateral) ? (
                  <div>
                    <div className="inline-block muted">
                      <span style={{ color: "#8391A4" }}>
                        ${formatAmount(position.collateral, USD_DECIMALS, 2, true)}
                      </span>
                      <BsArrowRight className="transition-arrow" />
                    </div>
                    ${formatAmount(nextCollateral, USD_DECIMALS, 2, true)}
                  </div>
                ) : (
                  `$${formatAmount(position.collateral, USD_DECIMALS, 4, true)}`
                )}
              </div>
            </div>
            {!keepLeverage && (
              <div className="Exchange-info-row leverage">
                <div className="Exchange-info-label">
                  <Trans>Leverage</Trans>
                </div>
                <div className="align-right">
                  {isClosing && "-"}
                  {!isClosing && (
                    <div>
                      {!nextLeverage && <div>{formatAmount(position.leverage, 4, 2)}x</div>}
                      {nextLeverage && (
                        <div>
                          <div className="inline-block muted">
                            {formatAmount(position.leverage, 4, 2)}x
                            <BsArrowRight className="transition-arrow" />
                          </div>
                          {formatAmount(nextLeverage, 4, 2)}x
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="Exchange-info-row pnl">
              <div className="Exchange-info-label">
                <Trans>PnL</Trans>
              </div>
              <div className="align-right">
                <span
                  style={{
                    color: hasProfitPnL ? "#3FB68B" : "#FF5353",
                  }}
                >
                  {deltaStr} ({deltaPercentageStr})
                </span>
              </div>
            </div>

            <div className="Exchange-info-row fees">
              <div className="Exchange-info-label">
                <Trans>Fees</Trans>
              </div>
              <div className="align-right">
                <FeesTooltip
                  isOpening={false}
                  positionFee={positionFee}
                  fundingFee={fundingFee}
                  executionFees={{
                    fee: executionFee,
                    feeUsd: executionFeeUsd,
                  }}
                  swapFee={swapFee}
                />
              </div>
            </div>

            <div className={"Exchange-info-row receive PositionSeller-receive-row top-line receive"}>
              <div className="Exchange-info-label">
                <Trans>Receive</Trans>
              </div>

              {!isSwapAllowed && receiveToken && (
                <div className="align-right PositionSelector-selected-receive-token">
                  {formatAmount(receiveAmount, receiveToken.decimals, 4, true)}
                  &nbsp;{receiveToken.symbol}
                  <span style={{ color: "#8391A4" }}>
                    (~$
                    {formatAmount(receiveUsd, USD_DECIMALS, 2, true)})
                  </span>
                </div>
              )}

              {isSwapAllowed && receiveToken && (
                <div className="align-right">
                  <TokenSelector
                    className={cx("PositionSeller-token-selector", {
                      warning: isNotEnoughReceiveTokenLiquidity || isCollateralPoolCapacityExceeded,
                    })}
                    label={t`Receive`}
                    showBalances={false}
                    chainId={chainId}
                    tokenAddress={receiveToken.address}
                    onSelectToken={(token) => {
                      setSwapToToken(token);
                      setSavedRecieveTokenAddress(token.address);
                    }}
                    tokens={toTokens}
                    getTokenState={(tokenOptionInfo) => {
                      if (!shouldSwap(collateralToken, tokenOptionInfo)) {
                        return;
                      }

                      const convertedTokenAmount = getTokenAmountFromUsd(
                        infoTokens,
                        tokenOptionInfo.address,
                        receiveUsd
                      );

                      const isNotEnoughLiquidity =
                        tokenOptionInfo.availableAmount.lt(convertedTokenAmount) ||
                        tokenOptionInfo.bufferAmount.gt(tokenOptionInfo.poolAmount.sub(convertedTokenAmount));

                      if (isNotEnoughLiquidity) {
                        const { maxIn, maxOut, maxInUsd, maxOutUsd } = getSwapLimits(
                          infoTokens,
                          collateralToken.address,
                          tokenOptionInfo.address
                        );

                        const collateralInfo = getTokenInfo(infoTokens, collateralToken.address);

                        return {
                          disabled: true,
                          message: (
                            <div>
                              <Trans>Insufficient Available Liquidity to swap to {tokenOptionInfo.symbol}:</Trans>
                              <br />
                              <br />
                              <StatsTooltipRow
                                label={t`Max ${collateralInfo.symbol} in`}
                                value={[
                                  `${formatAmount(maxIn, collateralInfo.decimals, 0, true)} ${collateralInfo.symbol}`,
                                  `($${formatAmount(maxInUsd, USD_DECIMALS, 0, true)})`,
                                ]}
                              />
                              <br />
                              <StatsTooltipRow
                                label={t`Max ${tokenOptionInfo.symbol} out`}
                                value={[
                                  `${formatAmount(maxOut, tokenOptionInfo.decimals, 2, true)} ${
                                    tokenOptionInfo.symbol
                                  }`,
                                  `($${formatAmount(maxOutUsd, USD_DECIMALS, 2, true)})`,
                                ]}
                              />
                            </div>
                          ),
                        };
                      }
                    }}
                    infoTokens={infoTokens}
                    showTokenImgInDropdown={true}
                    selectedTokenLabel={
                      <span className="PositionSelector-selected-receive-token">
                        {formatAmount(receiveAmount, receiveToken.decimals, 4, true)}&nbsp;
                        {receiveToken.symbol}
                        <span style={{ color: "#8391A4" }}>
                          (~$
                          {formatAmount(receiveUsd, USD_DECIMALS, 2, true)})
                        </span>
                      </span>
                    }
                  />
                </div>
              )}
            </div>
          </div>
          <div className="Exchange-swap-button-container">{renderPrimaryButton()}</div>
        </Modal>
      )}
    </div>
  );
}
