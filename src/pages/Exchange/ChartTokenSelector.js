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
  return <div></div>;
}
