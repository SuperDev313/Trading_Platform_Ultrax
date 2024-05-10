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
          </div>
        </Modal>
      )}
    </div>
  );
}
