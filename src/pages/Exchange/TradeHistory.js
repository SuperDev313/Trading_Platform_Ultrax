import React from "react";

export default function TradeHistory(props) {
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
    </div>
  );
}
