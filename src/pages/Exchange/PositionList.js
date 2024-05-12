import React, { useState } from "react";
import cx from "classnames";
import { Trans, t } from "@lingui/macro";

export default function PositionList(props) {
  return (
    <div className="PositionsList">
      <table className="Exchange-list large App-box">
        <tbody>
          {positions.length !== 0 && (
            <tr className="Exchange-list-header">
              <th>
                <Trans>Symbol</Trans>
              </th>
              <th>
                <Trans>Net Value</Trans>
              </th>
              <th>
                <Trans>Size</Trans>
              </th>
              <th>
                <Trans>Collateral</Trans>
              </th>
              <th>
                <Trans>Entry Price</Trans>
              </th>
              <th>
                <Trans>Market Price</Trans>
              </th>
              <th>
                <Trans>Liq. Price</Trans>
              </th>
              <th>
                <Trans>Close Positions</Trans>
              </th>
            </tr>
          )}

          {positions.map((position) => {
            const liquidationPrice = getLiquidationPrice(position) || bigNumberify(0);
            const positionOrders = getOrdersForPosition(account, position, orders, nativeTokenAddress);
            const hasOrderError = !!positionOrders.find((order) => order.error);
            const hasPositionProfit = position[showPnlAfterFees ? "hasProfitAfterFees" : "hasProfit"];
            const positionDelta =
              position[showPnlAfterFees ? "pendingDeltaAfterFees" : "pendingDelta"] || bigNumberify(0);
            let borrowFeeUSD;
            if (position.collateralToken && position.collateralToken.fundingRate) {
              const borrowFeeRate = position.collateralToken.fundingRate
                .mul(position.size)
                .mul(24)
                .div(FUNDING_RATE_PRECISION);
              borrowFeeUSD = formatAmount(borrowFeeRate, USD_DECIMALS, 2, true);
            }
            // body content of the position list on web
            return (
              <tr key={position.key} className="Exchange-list-item">
                <td>
                  <div className="Exchange-list-title">
                    <div
                      className="Exchange-symbol-mark"
                      style={{ background: position.isLong ? "#3FB68B" : "#FF5353" }}
                    ></div>
                    {position.indexToken.symbol}
                    {!position.leverageStr && <ImSpinner2 className="spin position-loading-icon" />}
                    <div className="Exchange-list-info-label">
                      {position.leverageStr && (
                        <div
                          className="Exchange-list-info-label-long-short"
                          style={{
                            background: position.isLong ? "rgba(46, 199, 135, 0.10)" : "rgba(229, 97, 97, 0.10)",
                            border: position.isLong ? "1px solid #3FB68B" : "1px solid #FF5353",
                            color: position.isLong ? "#3FB68B" : "#FF5353",
                          }}
                        >
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              openSettings();
                            }}
                            className="muted Position-leverage"
                          >
                            {position.leverageStr}
                          </span>
                          <span className={cx({ positive: position.isLong, negative: !position.isLong })}>
                            {position.isLong ? t`Long` : t`Short`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td>
                  <div>{position.netValue ? <NetValueTooltip position={position} /> : t`Opening...`}</div>

                  {position.deltaStr && (
                    <div
                      className={cx("Exchange-list-info-label cursor-pointer Position-pnl", {
                        positive: hasPositionProfit && positionDelta.gt(0),
                        negative: !hasPositionProfit && positionDelta.gt(0),
                        muted: positionDelta.eq(0),
                      })}
                      onClick={openSettings}
                    >
                      {position.deltaStr} ({position.deltaPercentageStr})
                    </div>
                  )}
                </td>
                <td>
                  <div>${formatAmount(position.size, USD_DECIMALS, 2, true)}</div>
                </td>
                <td>
                  <div className="position-list-collateral">
                    <Tooltip
                      handle={`$${formatAmount(position.collateralAfterFee, USD_DECIMALS, 2, true)}`}
                      position="left-bottom"
                      handleClassName={cx("plain", { negative: position.hasLowCollateral })}
                      renderContent={() => {
                        return (
                          <>
                            {position.hasLowCollateral && (
                              <div>
                                <Trans>
                                  WARNING: This position has a low amount of collateral after deducting borrowing fees,
                                  deposit more collateral to reduce the position's liquidation risk.
                                </Trans>
                                <br />
                              </div>
                            )}
                            {!hideActions && (
                              <>
                                <Trans>Use the Edit Collateral icon to deposit or withdraw collateral.</Trans>
                              </>
                            )}
                          </>
                        );
                      }}
                    />
                    {!hideActions && (
                      // !position.hasPendingChanges && position.leverageStr &&
                      <span className="edit-icon" onClick={() => editPosition(position)}>
                        <img src={edit_icon} alt="edit" />
                      </span>
                    )}
                  </div>
                </td>
                <td>${formatAmount(position.averagePrice, USD_DECIMALS, 2, true)}</td>
                <td>${formatAmount(position.markPrice, USD_DECIMALS, 2, true)}</td>
                <td>${formatAmount(liquidationPrice, USD_DECIMALS, 2, true)}</td>
                <td>
                  <button
                    className="Exchange-list-action positions"
                    onClick={() => sellPosition(position)}
                    disabled={position.size.eq(0)}
                  >
                    <div className="Exchange-list-action-positions">
                      <Trans>Close</Trans>
                    </div>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
