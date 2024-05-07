import { useWeb3React } from "@web3-react/core";
import cx from "classnames";

import { NavLink } from "react-router-dom";

import { getContract } from "config/contracts";
import * as Api from "domain/legacy";
import { useAllOrders, useAllOrdersStats, usePositionsForOrders } from "domain/legacy";
import {
  DECREASE,
  getExchangeRate,
  getExchangeRateDisplay,
  getOrderKey,
  INCREASE,
  shortenAddress,
  shouldInvertTriggerRatio,
  SWAP,
  USD_DECIMALS,
} from "lib/legacy";

import "./OrdersOverview.css";
import { t, Trans } from "@lingui/macro";
import { getTokenInfo } from "domain/tokens/utils";
import { useInfoTokens } from "domain/tokens";
import { formatAmount } from "lib/numbers";
import { useChainId } from "lib/chains";
import { formatDateTime } from "lib/dates";

export default function OrdersOverview() {
    return (
        <div className="Orders-overview"> </div>
    )
}