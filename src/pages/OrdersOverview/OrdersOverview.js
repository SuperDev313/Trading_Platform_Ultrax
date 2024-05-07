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
    <div className="Orders-overview">
      <p>
        <span className="positive">
          <Trans>Price conditions are met</Trans>
        </span>
        <br />
        <span style={{ color: "orange" }}>
          <Trans>Close to execution price</Trans>
        </span>
        <br />
        <span className="negative">
          <Trans>Can't execute because of an error</Trans>
        </span>
      </p>
    </div>
  );
}
