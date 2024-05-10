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

import "./OrdersList.css";
import StatsTooltipRow from "../StatsTooltip/StatsTooltipRow";
import { TRIGGER_PREFIX_ABOVE, TRIGGER_PREFIX_BELOW } from "config/ui";
import { getTokenInfo, getUsd } from "domain/tokens/utils";
import { formatAmount } from "lib/numbers";
// import ExternalLink from "components/ExternalLink/ExternalLink";

function getOrderTitle(order, indexTokenSymbol) {
  const orderTypeText = order.type === INCREASE ? t`Increase` : t`Decrease`;
  return `${orderTypeText} ${indexTokenSymbol}`;
}

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

  const [editingOrder, setEditingOrder] = useState(null);

  const onCancelClick = useCallback(
    (order) => {
      handleCancelOrder(chainId, library, order, { pendingTxns, setPendingTxns });
    },
    [library, pendingTxns, setPendingTxns, chainId]
  );
  const renderHead = useCallback(() => {
    return (
      <tr className="Exchange-list-header order-list row">
        <th className="Symbol">
          <Trans>Symbol</Trans>
        </th>
        <th className="Order">
          <Trans>Order</Trans>
        </th>
        <th className="Type">
          <Trans>Type</Trans>
        </th>
        <th className="Side">
          <Trans>Side</Trans>
        </th>
        <th className="OrderPrice">
          <Trans>Order Price</Trans>
        </th>
        <th className="Amount">
          <Trans>Amount</Trans>
        </th>
        <th className="Edit">
          <div></div>
        </th>
        <th className="Close">
          <div></div>
        </th>
      </tr>
    );
  }, []);

  const onEditClick = useCallback(
    (order) => {
      setEditignOrder(order);
    },
    [setEditingOrder]
  );

  const renderEmptyRow = useCallback(() => {
    if (orders && orders.length) {
      return null;
    }

    return (
      <tr>
        <td colSpan="6">
          {!account ? (
            <div className="Exchange-list-no-connect">
              <span className="Exchange-list-no-connect-title">Wallet Required</span>
              <span className="Exchange-list-no-connect-text">Connect wallet to view your opening orders</span>
            </div>
          ) : (
            orders.length === 0 && (
              <div
                style={{
                  width: "100%",
                }}
              >
                <div
                  className="fz-lg fw-600 text-primary"
                  style={{
                    textAlign: "center",
                    marginTop: "4rem",
                  }}
                >
                  No Order Found
                </div>
                <div
                  className="fz-sm fw-500 text-secondary"
                  style={{
                    textAlign: "center",
                    marginTop: "0.5rem",
                    marginBottom: "4rem",
                  }}
                >
                  You have no opening order
                </div>
              </div>
            )
          )}
        </td>
      </tr>
    );
  }, [account, orders]);

  const renderActions = useCallback(
    (order) => {
      return (
        <>
          <td>
            <button className="Exchange-list-action Edit" onClick={() => onEditClick(order)}>
              <Trans>Edit</Trans>
            </button>
          </td>
          <td>
            <button className="Exchange-list-action Close" onClick={() => onCancelClick(order)}>
              <img src={cancelX} alt="cancelX" />
            </button>
          </td>
        </>
      );
    },
    [onEditClick, onCancelClick]
  );

    return (
    <React.Fragment>
      <table className="Exchange-list Orders large App-box">
        <tbody>
          {!!account && !!orders && !!orders.length && renderHead()}
          {renderEmptyRow()}
          <div className="Exchange-list-container">{renderLargeList()}</div>
        </tbody>
      </table>
      {!account ? (
        <div className="Exchange-list Orders small no-order">
          <div className="Exchange-list-no-connect">
            <span className="Exchange-list-no-connect-title">Wallet Required</span>
            <span className="Exchange-list-no-connect-text">Connect wallet to view your positions</span>
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="Exchange-list Orders small no-order">
          <div
            style={{
              width: "100%",
            }}
          >
            <div
              className="fz-lg fw-600 text-primary"
              style={{
                textAlign: "center",
                marginTop: "4rem",
              }}
            >
              No Order Found
            </div>
            <div
              className="fz-sm fw-500 text-secondary"
              style={{
                textAlign: "center",
                marginTop: "0.5rem",
                marginBottom: "4rem",
              }}
            >
              You have no open order
            </div>
          </div>
        </div>
      ) : (
        <div className="Exchange-list Orders small order-list">{renderSmallList()}</div>
      )}
      {editingOrder && (
        <OrderEditor
          account={account}
          order={editingOrder}
          setEditingOrder={setEditingOrder}
          infoTokens={infoTokens}
          pendingTxns={pendingTxns}
          setPendingTxns={setPendingTxns}
          getPositionForOrder={getPositionForOrder}
          positionsMap={positionsMap}
          library={library}
          totalTokenWeights={totalTokenWeights}
          usdgSupply={usdgSupply}
          savedShouldDisableValidationForTesting={savedShouldDisableValidationForTesting}
        />
      )}
    </React.Fragment>
  );
}
