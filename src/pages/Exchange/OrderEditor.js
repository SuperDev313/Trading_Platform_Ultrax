import React, { useState, useMemo } from "react";
import { BsArrowRight } from "react-icons/bs";

import {
  PRECISION,
  USD_DECIMALS,
  SWAP,
  DECREASE,
  INCREASE,
  isTriggerRatioInverted,
  getNextToAmount,
  getExchangeRate,
  getExchangeRateDisplay,
  calculatePositionDelta,
  getLiquidationPrice,
} from "lib/legacy";
import { updateSwapOrder, updateIncreaseOrder, updateDecreaseOrder } from "domain/legacy";
import Modal from "../Modal/Modal";

export default function OrderEditor(props) {
  const {
    account,
    order,
    setEditingOrder,
    infoTokens,
    pendingTxns,
    setPendingTxns,
    library,
    totalTokenWeights,
    usdgSupply,
    getPositionForOrder,
    positionsMap,
    savedShouldDisableValidationForTesting,
  } = props;

  return (
    <Modal
      isVisible={true}
      className="Exchange-list-modal"
      setIsVisible={() => setEditingOrder(null)}
      label={t`Edit order`}
    ></Modal>
  );
}
