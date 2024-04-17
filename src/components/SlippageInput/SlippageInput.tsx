import { useState } from "react";
import cx from "classnames";
import { formatAmount } from "lib/numbers";

const MAX_SLIPPAGE = 99 * 100;
const HIGH_SLIPPAGE = 2 * 100;
const SLIPPAGE_SUGGESTION_LISTS = [0, 3, 0.5, 1, 1.5];
const validDecimalRegex = /^\d+(\.\d{0,2})?$/; // 0.00 ~ 99.99

function getSlippageText(value: number) {
  return formatAmount(value, 2, 2).replace(/0+$/, "");
}

type Props = {
  setAllowedSlippage: (value: number) => void;
  defaultSlippage: number;
};

export default function SlippageInput({ setAllowedSlippage, defaultSlippage }: Props) {
  return (
    <div className="Slippage-input-wrapper">
      <div></div>
    </div>
  );
}
