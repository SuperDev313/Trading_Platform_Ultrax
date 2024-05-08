import { useEffect, useMemo, useState } from "react";
import { Menu } from "@headlessui/react";
import cx from "classnames";
// import "./ChartTokenSelector.css";
import { LONG, SHORT, SWAP } from "lib/legacy";
import { getTokens, getWhitelistedTokens } from "config/tokens";
import { IoSearch, IoStar, IoStarOutline } from "react-icons/io5";
import { AutoSizer, Column, Table } from "react-virtualized";
import "react-virtualized/styles.css";
import useSWR from "swr";

export default function ChartTokenSelector(props) {
  return (
    <Menu>
      <Menu.Button as="div" disabled={isSwap}>
        <div
          className="Container-select-tokens"
          style={{
            width: "fit-content",
          }}
        >
          <div className="button-select-token-chart">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M4 18H20M4 6H20H4ZM4 12H12H4Z"
                stroke="#F7F7F7"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19 11L17 13L15 11"
                stroke="#F7F7F7"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <button
              style={{
                paddingRight: "0px",
              }}
              className={cx("App-cta small transparent chart-token-selector", { "default-cursor": isSwap })}
            >
              <span className="fz-lg fw-600">{value.symbol}USD</span>
            </button>
          </div>
        </div>
      </Menu.Button>
    </Menu>
  );
}
