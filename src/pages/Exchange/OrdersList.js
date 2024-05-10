import React, { useState, useCallback } from "react";
import { t, Trans } from "@lingui/macro";
import cancelX from "../../img/cancelX.svg";
import {
  SWAP,
  INCREASE,
  DECREASE,
  USD_DECIMALS,
  getOrderError,
  getExchangeRateDisplay,
  getExchangeRate,
  getPositionForOrder,
} from "lib/legacy";
import { handleCancelOrder } from "domain/legacy";
import { getContract } from "config/contracts";

export default function OrdersList(props) {
  const {
    account,
    library,
    setPendingTxns,
    pendingTxns,
    infoTokens,
    positionsMap,
    totalTokenWeights,
    usdgSupply,
    orders,
    hideActions,
    chainId,
    savedShouldDisableValidationForTesting,
    cancelOrderIdList,
    setCancelOrderIdList,
  } = props;

  return (
    <React.Fragment>
      <table className="Exchange-list Orders large App-box">
        <tbody>
          {!!account && !!orders && !!orders.length && renderHead()}
          {renderEmptyRow()}
          <div className="Exchange-list-container">{renderLargeList()}</div>
        </tbody>
      </table>
    </React.Fragment>
  );
}
