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
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
