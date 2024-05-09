import React, { useCallback, useState, useMemo, useRef, useEffect } from "react";
import { useKey } from "react-use";
import "./ConfirmationBox.css";
import {
  USD_DECIMALS,
  PRECISION,
  BASIS_POINTS_DIVISOR,
  LIMIT,
  MIN_PROFIT_TIME,
  INCREASE,
  getExchangeRate,
  getExchangeRateDisplay,
  DEFAULT_SLIPPAGE_AMOUNT,
  DEFAULT_HIGHER_SLIPPAGE_AMOUNT,
  calculatePositionDelta,
  DECREASE,
} from "lib/legacy";

export default function ConfirmationBox(props) {
  return (
    <div className="Confirmation-box">
      <Modal isVisible={true} setIsVisible={() => setIsConfirming(false)} label={title}>
        <div className="Confirmation-box-row" ref={submitButtonRef}>
          <Button
            variant={
              textButton.includes("Long")
                ? "long-action"
                : textButton.includes("Short")
                ? "short-action"
                : "brand-action"
            }
            onClick={onConfirmationClick}
            className="w-full mt-sm"
            disabled={!isPrimaryEnabled()}
            type="submit"
          >
            {getPrimaryText()}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
