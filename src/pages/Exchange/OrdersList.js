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

  const renderLargeList = useCallback(() => {
    if (!orders || !orders.length) {
      return null;
    }
    return orders.reverse().map((order) => {
      if (order.type === SWAP) {
        const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
        const fromTokenInfo = getTokenInfo(infoTokens, order.path[0], true, nativeTokenAddress.toLowerCase());
        const toTokenInfo = getTokenInfo(
          infoTokens,
          order.path[order.path.length - 1],
          order.shouldUnwrap,
          nativeTokenAddress.toLowerCase()
        );
        const collateralUSD = getUsd(order.amountIn, fromTokenInfo.address, true, infoTokens);
        const markExchangeRate = getExchangeRate(fromTokenInfo, toTokenInfo);
        const orderId = `${order.type}-${order.index}`;
        const titleText = (
          <>
            <Trans>Swap</Trans>{" "}
            {formatAmount(
              order.amountIn,
              fromTokenInfo.decimals,
              fromTokenInfo.isStable || fromTokenInfo.isUsdg ? 2 : 4,
              true
            )}{" "}
            {fromTokenInfo?.symbol} for{" "}
            {formatAmount(order.minOut, toTokenInfo.decimals, toTokenInfo.isStable || toTokenInfo.isUsdg ? 2 : 4, true)}{" "}
            {toTokenInfo?.symbol}
          </>
        );

        return (
          <tr className="Exchange-list-item" key={orderId}>
            <td className="Exchange-list-item-type">
              <Trans>Limit</Trans>
            </td>
            <td>
              <Tooltip
                handle={titleText}
                position="right-bottom"
                renderContent={() => {
                  return (
                    <StatsTooltipRow
                      label={t`Collateral`}
                      value={`${formatAmount(collateralUSD, USD_DECIMALS, 2, true)} (${formatAmount(
                        order.amountIn,
                        fromTokenInfo.decimals,
                        4,
                        true
                      )}
                      ${fromTokenInfo.baseSymbol || fromTokenInfo?.symbol})`}
                    />
                  );
                }}
              />
            </td>
            <td>
              {!hideActions ? (
                <Tooltip
                  handle={getExchangeRateDisplay(order.triggerRatio, fromTokenInfo, toTokenInfo)}
                  renderContent={() => t`
                  You will receive at least ${formatAmount(
                    order.minOut,
                    toTokenInfo.decimals,
                    toTokenInfo.isStable || toTokenInfo.isUsdg ? 2 : 4,
                    true
                  )} ${
                    toTokenInfo?.symbol
                  } if this order is executed. The execution price may vary depending on swap fees at the time the order is executed.
                `}
                />
              ) : (
                getExchangeRateDisplay(order.triggerRatio, fromTokenInfo, toTokenInfo)
              )}
            </td>
            <td>{getExchangeRateDisplay(markExchangeRate, fromTokenInfo, toTokenInfo, true)}</td>
            {!hideActions && renderActions(order)}
          </tr>
        );
      }

      const indexToken = getTokenInfo(infoTokens, order.indexToken.toLowerCase());
      const indexTokenSymbol = indexToken?.isWrapped ? indexToken?.baseSymbol : indexToken?.symbol;
      const error = getOrderError(account, order, positionsMap);
      const orderTitle = getOrderTitle(order, indexTokenSymbol);

      const orderText = (
        <>
          {error ? (
            <Tooltip
              className="order-error"
              handle={orderTitle}
              position="right-bottom"
              handleClassName="plain"
              renderContent={() => <span className="negative">{error}</span>}
            />
          ) : (
            orderTitle
          )}
        </>
      );
      const longShortText = order.isLong ? t`Long` : t`Short`;
      const sizeDeltaText = formatAmount(order.sizeDelta, USD_DECIMALS, 2, true);
      return (
        <tr className="Exchange-list-item order-list row" key={`${order.isLong}-${order.type}-${order.index}`}>
          <td className="Symbol">
            <div className="Exchange-symbol-label-long-short">
              <div className="Exchange-symbol-mark" style={{ background: order.isLong ? "#3FB68B" : "#FF5353" }}></div>
              {indexTokenSymbol}
            </div>
          </td>
          <td className="Order">{order.type === DECREASE ? orderText : orderText}</td>
          <td className="Exchange-list-item-type Type">{order.type === INCREASE ? t`Limit` : t`Trigger`}</td>
          <td className="Side">
            <div style={{ color: order.isLong ? "#3FB68B" : "#FF5353" }}>{longShortText}</div>
          </td>
          <td className="OrderPrice">${formatAmount(order.triggerPrice, USD_DECIMALS, 2, true)}</td>
          <td className="Amount">${sizeDeltaText}</td>
          {!hideActions && (
            <>
              <td className="Edit">
                <button className="Exchange-list-action" onClick={() => onEditClick(order)}>
                  <Trans>Edit</Trans>
                </button>
              </td>
              <td className="Close">
                <button className="Exchange-list-action" onClick={() => onCancelClick(order)}>
                  <img src={cancelX} alt="cancelX" />
                </button>
              </td>
            </>
          )}
        </tr>
      );
    });
  }, [orders, renderActions, infoTokens, positionsMap, hideActions, chainId, account, onCancelClick, onEditClick]);

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
