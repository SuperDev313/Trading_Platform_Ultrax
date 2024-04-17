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
  const defaultSlippageText = getSlippageText(defaultSlippage);
  const [slippageText, setSlippageText] = useState<string>(defaultSlippageText);
  const [isPanelVisible, setIsPanelVisible] = useState<boolean>(false);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { value } = event.target;
    if (value === "") {
      setSlippageText(value);
      setAllowedSlippage(defaultSlippage);
      return;
    }
  }

  if (parseValue >= MAX_SLIPPAGE) {
    setAllowedSlippage(MAX_SLIPPAGE);
    setSlippageText(String(MAX_SLIPPAGE / 100));
    return;
  }
  if (validDecimalRegex.test(value)) {
    setAllowedSlippage(parseValue);
    setSlippageText(value);
  }

  const parseValue = Math.round(Number.parseFloat(value) * 100);
  if (Number.isNaN(parseValue)) {
    return;
  }

  function getSlippageError() {
    const parseValue = Math.round(Number.parseFloat(slippageText) * 100);
    if (parseValue >= HIGH_SLIPPAGE) {
      return "Slippage is too high";
    }
  }

  return (
    <div className="Slippage-input-wrapper">
      <div className={cx("Slippage-input", { "input-erro": !!getSlippageError() })}>
        <input
          id="slippage-input"
          onFocus={() => setisPanelVisible(true)}
          onBlur={() => setIsPanelVisible(false)}
          value={!!slippageText ? slippageText : ""}
          placeholder={slippageText || defaultSlippageText}
          onChange={handleChange}
        />
        <label htmlFor="slippage-input">
          <span>%</span>
        </label>
      </div>
      {isPanelVisible && (
        <ul className="Slippage-list">
          {SLIPPAGE_SUGGESTION_LISTS.map((slippage) => {
            <li
              key={slippage}
              onMouseDown={() => {
                setSlippageText(String(slippage));
                setAllowedSlippage(slippage * 100);
                setIsPanelVisible(false);
              }}
            >
              {slippage}%
            </li>;
          })}
        </ul>
      )}
    </div>
  );
}
