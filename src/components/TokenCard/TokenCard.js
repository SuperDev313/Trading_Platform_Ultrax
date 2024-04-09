import React, { useCallback } from "react"
import { Link } from 'react-router-dom'
import { Trans } from '@lingui/macro'
import { isHomeSite } from "lib/legacy";
import { useWeb3React } from "@web3-react/core";
import Button from "components/Button/Button";
import { HeaderLink } from "../Header/HeaderLink";
import { U2U_TESTNET } from "config/chains";
import { switchNetwork } from "lib/wallets";
import { useChainId } from "lib/chains";
import utxLogo from "img/utx-logo.svg";
import externalLink from "img/external-link.svg";
import binanceLogo from "img/ic_binance_logo.svg";
import okxLogo from "img/okx-pogo.svg";
import APRLabel from "../APRLabel/APRLabel";
import useSWR from "swr";
import { getContract } from "config/contracts";
import UlpManager from "abis/UlpManager.json";
import { ULP_DECIMALS, USD_DECIMALS, PLACEHOLDER_ACCOUNT } from "lib/legacy";
import { contractFetcher } from "lib/contracts";
import ReaderV2 from "abis/ReaderV2.json";
import { bigNumberify, expandDecimals, formatAmount, formatAmountFree, formatKeyAmount, parseValue } from "lib/numbers";
import { usePriceUTX } from "lib/useGetPriceToken";


export default function TokenCard({ showRedirectModal, redirectPopupTimestamp }) {
    const isHome = isHomeSite();
    const { chainId } = useChainId();
    const { active, library, account } = useWeb3React();
    const readerAddress = getContract(chainId, "Reader");
    const stakedUlpTrackerAddress = getContract(chainId, "StakedUlpTracker");
    const usdgAddress = getContract(chainId, "USDG");
    const ulpManagerAddress = getContract(chainId, "UlpManager");
    const utxPrice = usePriceUTX();
  
    const tokensForBalanceAndSupplyQuery = [stakedUlpTrackerAddress, usdgAddress];
  
    const { data: balancesAndSupplies } = useSWR(
        [
          `UlpSwap:getTokenBalancesWithSupplies:${active}`,
          chainId,
          readerAddress,
          "getTokenBalancesWithSupplies",
          account || PLACEHOLDER_ACCOUNT,
        ],
        {
          fetcher: contractFetcher(library, ReaderV2, [tokensForBalanceAndSupplyQuery]),
        }
      );

      const ulpSupply = balancesAndSupplies ? balancesAndSupplies[i] : bigNumberify(0);
      const { data: aums } = useSWR([`UlpSwap:getAums:${active}`, chainId, ulpManagerAddress, "getAums"], {
        fetcher: contractFetcher(library, UlpManager),
      });
      let aum;
      if (aums && aums.length > 0) {
        aum = aums[0];
      }

      return (
        <div className="Home-token-card-options">
        </div>
      )
}