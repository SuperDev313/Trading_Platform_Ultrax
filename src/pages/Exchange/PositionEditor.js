import React, { useEffect, useState } from "react";
import useSWR from "swr";
import { Trans, t } from "@lingui/macro";
import { ethers } from "ethers";
import { BsArrowRight } from "react-icons/bs";

import {
  USD_DECIMALS,
  BASIS_POINTS_DIVISOR,
  DEPOSIT_FEE,
  DUST_BNB,
  getLiquidationPrice,
  MAX_ALLOWED_LEVERAGE,
  getFundingFee,
} from "lib/legacy";
import { getContract } from "config/contracts";
import Tab from "../Tab/Tab";
import Modal from "../Modal/Modal";

export default function PositionEditor(props) {
  const {
    pendingPositions,
    setPendingPositions,
    positionsMap,
    positionKey,
    isVisible,
    setIsVisible,
    infoTokens,
    active,
    account,
    library,
    collateralTokenAddress,
    pendingTxns,
    setPendingTxns,
    getUsd,
    getLeverage,
    savedIsPnlInLeverage,
    positionRouterApproved,
    isWaitingForPositionRouterApproval,
    isPositionRouterApproving,
    approvePositionRouter,
    chainId,
    minExecutionFee,
    minExecutionFeeUSD,
    minExecutionFeeErrorMessage,
    isContractAccount,
  } = props;

  return (
    <div className="PositionEditor">
      {position && (
        <Modal isVisible={isVisible} setIsVisible={setIsVisible} label={title}>
          <div>
            <Tab
              options={EDIT_OPTIONS}
              optionLabels={EDIT_OPTIONS_LABELS}
              option={option}
              setOption={setOption}
              onChange={resetForm}
            />
            {(isDeposit || isWithdrawal) && (
              <div>
                <div className="Exchange-swap-section">
                  <div className="Exchange-swap-section-top">
                    <div className="muted title-edit-position-muted">
                      {convertedAmountFormatted && (
                        <div className="Exchange-swap-usd">{isDeposit ? t`Deposit` : t`Withdraw`}</div>
                      )}
                      {!convertedAmountFormatted && `${isDeposit ? t`Deposit` : t`Withdraw`}`}
                    </div>
                    {maxAmount && (
                      <div className="muted align-right clickable" onClick={() => setFromValue(maxAmountFormattedFree)}>
                        <span className="title-edit-position-muted">Balance:&nbsp;</span>
                        <Trans>{maxAmountFormatted}</Trans>
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
                      {fromValue !== maxAmountFormattedFree && maxAmount?.gt(0) && (
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
                    <div className="PositionEditor-token-symbol">
                      {isDeposit ? position.collateralToken.symbol : "USD"}
                    </div>
                  </div>
                </div>
                <div className="PositionEditor-info-box">
                  {minExecutionFeeErrorMessage && (
                    <div className="Conformation-box-warning">{minExecutionFeeErrorMessage}</div>
                  )}
                  <div className="Exchange-info-row size">
                    <div className="Exchange-info-label">
                      <Trans>Size</Trans>
                    </div>
                    <div className="align-right">{formatAmount(position.size, USD_DECIMALS, 2, true)} USD</div>
                  </div>
                  <div className="Exchange-info-row collateral">
                    <div className="Exchange-info-label">
                      <Trans>Collateral ({collateralToken.symbol})</Trans>
                    </div>
                    <div className="align-right">
                      {!nextCollateral && (
                        <div>${formatAmount(position.collateralAfterFee, USD_DECIMALS, 2, true)}</div>
                      )}
                      {nextCollateral && (
                        <div>
                          <div className="inline-block muted edit-collateral">
                            ${formatAmount(position.collateralAfterFee, USD_DECIMALS, 2, true)}
                            <BsArrowRight className="transition-arrow" />
                          </div>
                          ${formatAmount(nextCollateral, USD_DECIMALS, 2, true)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="Exchange-info-row market-price">
                    <div className="Exchange-info-label">
                      <Trans>Market Price</Trans>
                    </div>
                    <div className="align-right">${formatAmount(position.markPrice, USD_DECIMALS, 2, true)}</div>
                  </div>
                  <div className="Exchange-info-row leverage">
                    <div className="Exchange-info-label">
                      <Trans>Leverage</Trans>
                    </div>
                    <div className="align-right">
                      {!nextLeverage && <div>{formatAmount(position.leverage, 4, 2, true)}x</div>}
                      {nextLeverage && (
                        <div>
                          <div className="inline-block muted edit-collateral">
                            {formatAmount(position.leverage, 4, 2, true)}x
                            <BsArrowRight className="transition-arrow" />
                          </div>
                          {formatAmount(nextLeverage, 4, 2, true)}x
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="Exchange-info-row liq-price">
                    <div className="Exchange-info-label">
                      <Trans>Liq. Price</Trans>
                    </div>
                    <div className="align-right">
                      {!nextLiquidationPrice && (
                        <div>
                          {!fromAmount && `$${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}`}
                          {fromAmount && "-"}
                        </div>
                      )}
                      {nextLiquidationPrice && (
                        <div>
                          <div className="inline-block muted edit-collateral">
                            ${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}
                            <BsArrowRight className="transition-arrow" />
                          </div>
                          ${formatAmount(nextLiquidationPrice, USD_DECIMALS, 2, true)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
