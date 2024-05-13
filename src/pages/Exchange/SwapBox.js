import React, { useEffect, useMemo, useState } from "react";
import NoLiquidityErrorModal from "./NoLiquidityErrorModal";
import "./SwapBox.scss";

export default function SwapBox(props) {
  return (
    <div className="Exchange-swap-box">
              <div className="Exchange-swap-info-group">
        {isSwap && (
          <div className="Exchange-swap-market-box App-box App-box-border">
            <div className="Exchange-swap-market-box-title">
              <Trans>Swap</Trans>
            </div>
            {/* <div className="App-card-divider"></div> */}
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>{fromToken.symbol} Price</Trans>
              </div>
              <div className="align-right text-primary">
                ${fromTokenInfo && formatAmount(fromTokenInfo.minPrice, USD_DECIMALS, 2, true)}
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>{toToken.symbol} Price</Trans>
              </div>
              <div className="align-right text-primary">
                ${toTokenInfo && formatAmount(toTokenInfo.maxPrice, USD_DECIMALS, 2, true)}
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Available Liquidity</Trans>
              </div>

              <div className="align-right al-swap">
                <Tooltip
                  handle={`$${formatAmount(maxSwapAmountUsd, USD_DECIMALS, 2, true)}`}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <div>
                        <StatsTooltipRow
                          label={t`Max ${fromTokenInfo.symbol} in`}
                          value={[
                            `${formatAmount(maxFromTokenIn, fromTokenInfo.decimals, 0, true)} ${fromTokenInfo.symbol}`,
                            `($${formatAmount(maxFromTokenInUSD, USD_DECIMALS, 0, true)})`,
                          ]}
                        />
                        <StatsTooltipRow
                          label={t`Max ${toTokenInfo.symbol} out`}
                          value={[
                            `${formatAmount(maxToTokenOut, toTokenInfo.decimals, 0, true)} ${toTokenInfo.symbol}`,
                            `($${formatAmount(maxToTokenOutUSD, USD_DECIMALS, 0, true)})`,
                          ]}
                        />
                      </div>
                    );
                  }}
                />
              </div>
            </div>
            {!isMarketOrder && (
              <ExchangeInfoRow label={t`Price`}>
                {getExchangeRateDisplay(getExchangeRate(fromTokenInfo, toTokenInfo), fromToken, toToken)}
              </ExchangeInfoRow>
            )}
          </div>
        )}
        {(isLong || isShort) && (
          <div className="Exchange-swap-market-box App-box App-box-border">
            <div className="Exchange-swap-market-box-title">
              {isLong ? t`Long` : t`Short`}&nbsp;{toToken.symbol}
            </div>
            {/* <div className="App-card-divider" /> */}
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Entry Price</Trans>
              </div>
              <div className="align-right text-primary">
                <Tooltip
                  handle={`$${formatAmount(entryMarkPrice, USD_DECIMALS, 2, true)}`}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <div>
                        <Trans>
                          The position will be opened at {formatAmount(entryMarkPrice, USD_DECIMALS, 2, true)} USD with
                          a max slippage of {parseFloat(savedSlippageAmount / 100.0).toFixed(2)}%.
                          <br />
                          <br />
                          The slippage amount can be configured under Settings, found by clicking on your address at the
                          top right of the page after connecting your wallet.
                          <br />
                          <br />
                          {/* TODO: ADD LINK DOCS */}
                          <ExternalLink href="">More Info</ExternalLink>
                        </Trans>
                      </div>
                    );
                  }}
                />
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Exit Price</Trans>
              </div>
              <div className="align-right text-primary">
                <Tooltip
                  handle={`$${formatAmount(exitMarkPrice, USD_DECIMALS, 2, true)}`}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <div>
                        <Trans>
                          If you have an existing position, the position will be closed at{" "}
                          {formatAmount(entryMarkPrice, USD_DECIMALS, 2, true)} USD.
                          <br />
                          <br />
                          This exit price will change with the price of the asset.
                          <br />
                          <br />
                          <ExternalLink href="">More Info</ExternalLink>
                        </Trans>
                      </div>
                    );
                  }}
                />
              </div>
            </div>
            <div className="Exchange-info-row">
              <div className="Exchange-info-label">
                <Trans>Borrow Fee</Trans>
              </div>
              <div className="align-right text-primary">
                <Tooltip
                  handle={borrowFeeText}
                  position="right-bottom"
                  renderContent={() => {
                    return (
                      <div>
                        {hasZeroBorrowFee && (
                          <div>
                            {isLong && t`There are more shorts than longs, borrow fees for longing is currently zero`}
                            {isShort && t`There are more longs than shorts, borrow fees for shorting is currently zero`}
                          </div>
                        )}
                        {!hasZeroBorrowFee && (
                          <div>
                            <Trans>
                              The borrow fee is calculated as (assets borrowed) / (total assets in pool) * 0.01% per
                              hour.
                            </Trans>
                            <br />
                            <br />
                            {isShort && t`You can change the "Collateral In" token above to find lower fees`}
                          </div>
                        )}
                        <br />
                        <ExternalLink href="">
                          <Trans>More Info</Trans>
                        </ExternalLink>
                      </div>
                    );
                  }}
                >
                  {!hasZeroBorrowFee && null}
                </Tooltip>
              </div>
            </div>
            {renderAvailableLongLiquidity()}
            {isShort && toTokenInfo.hasMaxAvailableShort && (
              <div className="Exchange-info-row">
                <div className="Exchange-info-label">
                  <Trans>Available Liquidity</Trans>
                </div>
                <div className="align-right text-primary">
                  <Tooltip
                    handle={`$${formatAmount(toTokenInfo.maxAvailableShort, USD_DECIMALS, 2, true)}`}
                    position="right-bottom"
                    renderContent={() => {
                      return (
                        <>
                          <StatsTooltipRow
                            label={t`Max ${toTokenInfo.symbol} short capacity`}
                            value={formatAmount(toTokenInfo.maxGlobalShortSize, USD_DECIMALS, 0, true)}
                          />
                          <StatsTooltipRow
                            label={t`Current ${toTokenInfo.symbol} shorts`}
                            value={formatAmount(toTokenInfo.globalShortSize, USD_DECIMALS, 0, true)}
                          />
                        </>
                      );
                    }}
                  ></Tooltip>
                </div>
              </div>
            )}
          </div>
        )}
        <UsefulLinks className="Useful-links-swapbox" />
      </div>
      <NoLiquidityErrorModal
        chainId={chainId}
        fromToken={fromToken}
        toToken={toToken}
        shortCollateralToken={shortCollateralToken}
        isLong={isLong}
        isShort={isShort}
        modalError={modalError}
        setModalError={setModalError}
      />
    </div>
  );
}
