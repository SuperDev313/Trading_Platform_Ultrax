import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { Link } from "react-router-dom";
import Tooltip from "components/Tooltip/Tooltip";
import { getTokenBySymbol, getToken } from "config/tokens";
import { getChainName } from "config/chains";
import { useChainId } from "lib/chains";

import {
  USD_DECIMALS,
  MAX_LEVERAGE,
  BASIS_POINTS_DIVISOR,
  LIQUIDATION_FEE,
  TRADES_PAGE_SIZE,
  deserialize,
  getExchangeRateDisplay,
  INCREASE,
} from "lib/legacy";
import { useTrades, useLiquidationsData } from "domain/legacy";
import { getContract } from "config/contracts";

import "./TradeHistory.css";
import { getExplorerUrl } from "config/chains";
import { bigNumberify, formatAmount } from "lib/numbers";
import { formatDateTime, formatTime, formatDate } from "lib/dates";
import StatsTooltipRow from "../StatsTooltip/StatsTooltipRow";
import { t, Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import Button from "components/Button/Button";

const { AddressZero } = ethers.constants;

function getPositionDisplay(increase, indexToken, isLong, sizeDelta) {
  const symbol = indexToken ? (indexToken.isWrapped ? indexToken.baseSymbol : indexToken.symbol) : "";
  return `
    ${increase ? t`Increase` : t`Decrease`} ${symbol} ${isLong ? t`Long` : t`Short`}
    ${increase ? "+" : "-"}${formatAmount(sizeDelta, USD_DECIMALS, 2, true)} USD`;
}

function getOrderActionTitle(action) {
  let actionDisplay;

  if (action.startsWith("Create")) {
    actionDisplay = t`Create`;
  } else if (action.startsWith("Cancel")) {
    actionDisplay = t`Cancel`;
  } else {
    actionDisplay = t`Update`;
  }

  return t`${actionDisplay} Order`;
}

function getLiquidationData(liquidationsDataMap, key, timestamp) {
  return liquidationsDataMap && liquidationsDataMap[`${key}:${timestamp}`];
}

const actions = {
  "IncreasePosition-Long": "Increase",
  "IncreasePosition-Short": "Increase",
  CreateIncreaseOrder: "Increase",
  CreateIncreasePosition: "Decrease",
  CreateDecreaseOrder: "Decrease",
  CreateDecreasePosition: "Decrease",
  CancelDecreaseOrder: "Decrease",
  CancelIncreaseOrder: "Increase",
  "DecreasePosition-Short": "Decrease",
  "DecreasePosition-Long": "Decrease",
  ExecuteDecreaseOrder: "Decrease",
  ExecuteIncreaseOrder: "Increase",
  UpdateDecreaseOrder: "Decrease",
  UpdateIncreaseOrder: "Increase",
  Swap: "Swap",
};

export default function TradeHistory(props) {
  const { account, infoTokens, getTokenInfo, chainId, nativeTokenAddress, shouldShowPaginationButtons } = props;
  const [pageIds, setPageIds] = useState({});
  const [pageIndex, setPageIndex] = useState(0);

  const getTradeParams = (trade) => {
    const tradeParams = JSON.parse(trade?.data?.params);
    try {
      if (trade?.data?.action === "Swap") {
        const tokenIn = getTokenInfo(infoTokens, tradeParams?.tokenIn, true, nativeTokenAddress);
        const tokenOut = getTokenInfo(infoTokens, tradeParams?.tokenOut, true, nativeTokenAddress);
        const triggerCondition = `${formatAmount(tradeParams?.amountIn, tokenIn.decimals, 4, true)} ${
          tokenIn.symbol
        } for ${formatAmount(tradeParams?.amountOut, tokenOut.decimals, 4, true)} ${tokenOut.symbol}`;
        return {
          symbol: `${tokenIn?.baseSymbol || tokenIn?.symbol}-${tokenOut?.baseSymbol || tokenOut?.symbol}` || "--",
          decimals: tokenIn?.decimals || "--",
          order: `${actions[trade.data.action] || trade.data.action}`,
          action: actions[trade.data.action],
          timestamp: trade.data.timestamp || null,
          txhash: trade.data.txhash || null,
          status: tradeParams.status || "--",
          acceptablePrice: triggerCondition,
          isLong: "--",
          sizeDelta: tradeParams.sizeDelta,
          msg: trade.msg || null,
        };
      } else {
        const token = getToken(chainId, tradeParams?.indexToken);
        const triggerCondition = `Price: ${tradeParams.isLong ? "<" : ">"} ${formatAmount(
          tradeParams.acceptablePrice,
          USD_DECIMALS,
          2,
          true
        )}`;
        return {
          symbol: token?.baseSymbol || token?.symbol || null,
          decimals: token?.decimals || null,
          order: `${actions[trade.data.action]} ${token?.baseSymbol || token?.symbol}`,
          action: actions[trade.data.action],
          timestamp: trade.data.timestamp || null,
          txhash: trade.data.txhash || null,
          status: tradeParams.status || "--",
          acceptablePrice: triggerCondition,
          isLong: tradeParams.isLong,
          sizeDelta: tradeParams.sizeDelta,
          msg: trade.msg || null,
        };
      }
    } catch (error) {
      console.error("getTradeParams error", error);
      return {
        symbol: "--",
        decimals: 2,
        order: `${actions[trade.data.action]}`,
        action: actions[trade.data.action],
        timestamp: trade.data.timestamp || "--",
        txhash: trade.data.txhash || null,
        status: tradeParams.status || "--",
        acceptablePrice: "--",
        isLong: tradeParams.isLong || "--",
        sizeDelta: tradeParams.sizeDelta || "--",
        msg: trade.msg || null,
      };
    }
  };

  const getAfterId = () => {
    return pageIds[pageIndex];
  };

  const { trades, updateTrades } = useTrades(chainId, account, props.forSingleAccount, getAfterId());

  const liquidationsData = useLiquidationsData(chainId, account);
  const liquidationsDataMap = useMemo(() => {
    if (!liquidationsData) {
      return null;
    }
    return liquidationsData.reduce((memo, item) => {
      const liquidationKey = `${item.key}:${item.timestamp}`;
      memo[liquidationKey] = item;
      return memo;
    }, {});
  }, [liquidationsData]);

  useEffect(() => {
    const interval = setInterval(() => {
      updateTrades(undefined, true);
    }, 10 * 1000);
    return () => clearInterval(interval);
  }, [updateTrades]);

  return (
    <div className="TradeHistory container">
      <div className="Exchange-list small trading-history">
        {tradesWithMessages.length > 0 &&
          tradesWithMessages.map((trade, index) => {
            const { symbol, order, timestamp, status, acceptablePrice, isLong, action, sizeDelta } =
              getTradeParams(trade);
            return (
              <div className="App-card App-card-container TradeHistory-row App-box App-box-border" key={index}>
                <div className="App-card-content">
                  <div className="App-card-title App-card-title-small">
                    <div className="App-card-title-small-left">
                      <span className="Exchange-list-title">{symbol}</span>
                      <div
                        className="App-card-title-small-long-short"
                        style={{
                          background: isLong ? "rgba(46, 199, 135, 0.10)" : "rgba(229, 97, 97, 0.10)",
                          border: isLong ? "1px solid #3FB68B" : "1px solid #FF5353",
                          color: isLong ? "#3FB68B" : "#FF5353",
                        }}
                      >
                        {isLong === "--" ? isLong : isLong ? "Long" : "Short"}
                      </div>
                    </div>
                  </div>
                  <div className="App-card-divider" />
                  <div className="App-card-row App-card-row-container">
                    <div className="App-card-row-item">
                      <div className="label">
                        <div>Order</div>
                      </div>
                      <div>{order}</div>
                    </div>
                    <div className="App-card-row-item">
                      <div className="label">
                        <div>Status</div>
                      </div>
                      <div>{status}</div>
                    </div>
                  </div>
                  <div className="App-card-row App-card-row-container">
                    <div className="App-card-row-item">
                      <div className="label">
                        <Trans>Amount</Trans>
                      </div>
                      <div>{`${action === "Increase" ? "+" : "-"}${formatAmount(
                        sizeDelta,
                        USD_DECIMALS,
                        2,
                        true
                      )} USD`}</div>
                    </div>
                    <div className="App-card-row-item">
                      <div className="label">
                        <Trans>Trigger Condition</Trans>
                      </div>
                      <div className="position-list-collateral">{acceptablePrice}</div>
                    </div>
                  </div>
                  <div className="App-card-row App-card-row-container">
                    <div className="App-card-row-item single-item">
                      <div className="label">
                        <div>Time</div>
                      </div>
                      <div>{formatDateTime(timestamp)}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
      <table className="Exchange-list large App-box trading-history">
        <tbody>
          {tradesWithMessages.length > 0 && (
            <tr className="Exchange-list-header trading-history row">
              <th className="Time">
                <Trans>Time</Trans>
              </th>
              <th className="Symbol">
                <Trans>Symbol</Trans>
              </th>
              <th className="Order">
                <Trans>Order</Trans>
              </th>
              <th className="Status">
                <Trans>Status</Trans>
              </th>
              <th className="Trigger">
                <Trans>Trigger Conditions</Trans>
              </th>
              <th className="Side">
                <Trans>Side</Trans>
              </th>
              <th className="Amount">
                <Trans>Amount</Trans>
              </th>
            </tr>
          )}
          <div className="Exchange-list-container">
            {tradesWithMessages.map((trade, index) => {
              const { symbol, order, timestamp, status, acceptablePrice, isLong, action, sizeDelta } =
                getTradeParams(trade);

              return (
                <tr key={index} className="Exchange-list-item trading-history row">
                  <td className="Time">
                    <div className="Exchange-symbol-mark" style={{ background: isLong ? "#3FB68B" : "#FF5353" }}></div>
                    <div>
                      {formatDate(timestamp)} {` `}
                      {formatTime(timestamp)}
                    </div>
                  </td>
                  <td className="Symbol">
                    <div>{symbol}</div>
                  </td>
                  <td className="Order">
                    <div>{order}</div>
                  </td>
                  <td className="Status">
                    <div>{status}</div>
                  </td>
                  <td className="Trigger">
                    <div>{acceptablePrice}</div>
                  </td>
                  <td className="Side">
                    <div style={{ color: isLong ? "#3FB68B" : "#FF5353" }}>
                      {isLong === "--" ? isLong : isLong ? "Long" : "Short"}
                    </div>
                  </td>
                  <td className="Amount">
                    <div>
                      {action === "Swap"
                        ? "--"
                        : `${action === "Increase" ? "+" : "-"}${formatAmount(sizeDelta, USD_DECIMALS, 2, true)} USD`}
                    </div>
                  </td>
                </tr>
              );
            })}
          </div>
        </tbody>
      </table>
      {shouldShowPaginationButtons && (
        <div className="gap-right">
          {pageIndex > 0 && (
            <Button variant="secondary" onClick={loadPrevPage}>
              <Trans>Prev</Trans>
            </Button>
          )}
          {trades && trades.length >= TRADES_PAGE_SIZE && (
            <Button variant="secondary" onClick={loadNextPage}>
              <Trans>Next</Trans>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
