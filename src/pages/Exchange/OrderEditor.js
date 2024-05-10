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

  const { chainId } = useChainId();

  const position = order.type !== SWAP ? getPositionForOrder(account, order, positionsMap) : null;
  const liquidationPrice = order.type === DECREASE && position ? getLiquidationPrice(position) : null;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");
  const fromTokenInfo =
    order.type === SWAP ? getTokenInfo(infoTokens, order.path[0], true, nativeTokenAddress.toLowerCase()) : null;
  const toTokenInfo =
    order.type === SWAP
      ? getTokenInfo(
          infoTokens,
          order.path[order.path.length - 1],
          order.shouldUnwrap,
          nativeTokenAddress.toLowerCase()
        )
      : null;

  const triggerRatioInverted = useMemo(() => {
    if (order.type !== SWAP) {
      return null;
    }

    return isTriggerRatioInverted(fromTokenInfo, toTokenInfo);
  }, [toTokenInfo, fromTokenInfo, order.type]);

  return (
    <Modal
      isVisible={true}
      className="Exchange-list-modal"
      setIsVisible={() => setEditingOrder(null)}
      label={t`Edit order`}
    >
      <div className="Exchange-swap-section">
        <div className="Exchange-swap-section-top">
          <div className="muted">
            <Trans>Price</Trans>
          </div>
          {fromTokenInfo && toTokenInfo && (
            <div
              className="muted align-right clickable"
              onClick={() => {
                setTriggerRatioValue(
                  formatAmountFree(getExchangeRate(fromTokenInfo, toTokenInfo, triggerRatioInverted), USD_DECIMALS, 10)
                );
              }}
            >
              <Trans>Mark Price: </Trans>
              {formatAmount(getExchangeRate(fromTokenInfo, toTokenInfo, triggerRatioInverted), USD_DECIMALS, 2)}
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
              value={triggerRatioValue}
              onChange={onTriggerRatioChange}
            />
          </div>
          {(() => {
            if (!toTokenInfo) return;
            if (!fromTokenInfo) return;
            const [tokenA, tokenB] = triggerRatioInverted ? [toTokenInfo, fromTokenInfo] : [fromTokenInfo, toTokenInfo];
            return (
              <div className="PositionEditor-token-symbol">
                {tokenA.symbol}&nbsp;/&nbsp;{tokenB.symbol}
              </div>
            );
          })()}
        </div>
      </div>
      <ExchangeInfoRow label={t`Minimum received`}>
        {triggerRatio && !triggerRatio.eq(order.triggerRatio) ? (
          <div style={{ display: "flex", alignItems: "center" }}>
            <span className="muted">{formatAmount(order.minOut, toTokenInfo.decimals, 4, true)}</span>
            &nbsp;
            <BsArrowRight />
            &nbsp;
            {formatAmount(toAmount, toTokenInfo.decimals, 4, true)}
          </div>
        ) : (
          formatAmount(order.minOut, toTokenInfo.decimals, 4, true)
        )}
        &nbsp;{toTokenInfo.symbol}
      </ExchangeInfoRow>
      <ExchangeInfoRow label={t`Price`}>
        {triggerRatio && !triggerRatio.eq(0) && !triggerRatio.eq(order.triggerRatio) ? (
          <>
            <span className="muted">
              {getExchangeRateDisplay(order.triggerRatio, fromTokenInfo, toTokenInfo, {
                omitSymbols: !triggerRatio || !triggerRatio.eq(order.triggerRatio),
              })}
            </span>
            &nbsp;
            <BsArrowRight />
            &nbsp;
            {getExchangeRateDisplay(triggerRatio, fromTokenInfo, toTokenInfo)}
          </>
        ) : (
          getExchangeRateDisplay(order.triggerRatio, fromTokenInfo, toTokenInfo, {
            omitSymbols: !triggerRatio || !triggerRatio.eq(order.triggerRatio),
          })
        )}
      </ExchangeInfoRow>
      {fromTokenInfo && (
        <div className="Exchange-info-row">
          <div className="Exchange-info-label">
            <Trans>{fromTokenInfo.symbol} price</Trans>
          </div>
          <div className="align-right">{formatAmount(fromTokenInfo.minPrice, USD_DECIMALS, 2, true)} USD</div>
        </div>
      )}
      {toTokenInfo && (
        <div className="Exchange-info-row">
          <div className="Exchange-info-label">
            <Trans>{toTokenInfo.symbol} price</Trans>
          </div>
          <div className="align-right">{formatAmount(toTokenInfo.maxPrice, USD_DECIMALS, 2, true)} USD</div>
        </div>
      )}
      <div className="Exchange-swap-button-container">
        <Button variant="primary-action" className="w-full" onClick={onClickPrimary} disabled={!isPrimaryEnabled()}>
          {getPrimaryText()}
        </Button>
      </div>
    </Modal>
  );
}
