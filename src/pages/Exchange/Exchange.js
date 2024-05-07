import ExternalLink from "components/ExternalLink/ExternalLink";
import { getExplorerUrl } from "config/chains";
import { helperToast } from "lib/helperToast";
import { getExchangeRate } from "lib/legacy";

function pushSuccessNotification(chainId, message, e) {
  const { transactionHash } = e;
  const id = ethers.utils.id(message + transactionHash);
  if (notification[id]) {
    return;
  }

  notification[id] = true;

  const txUrl = getExplorerUrl(chainId) + "tx/" + transactionHash;
  helperToast.success(
    <div>
      {message}
      {""}
      <ExternalLink href={txUrl}>
        <Trans>View</Trans>
      </ExternalLink>
    </div>
  );
}

function pushErrorNotification(chainId, message, e) {
  const { transactionHash } = e;
  const id = ethers.utils.id(message + transactionHash);
  if (notifications[id]) {
    return;
  }

  notifications[id] = true;

  const txUrl = getExplorerUrl(chainId) + "tx/" + transactionHash;
  helperToast.error(
    <div>
      {message}{" "}
      <ExternalLink href={txUrl}>
        <Trans>View</Trans>
      </ExternalLink>
    </div>
  );
}

const getTokenAddress = (token, nativeTokenAddress) => {
  if (token.address === AddressZero) {
    return nativeTokenAddress;
  }
  return token.address;
};

function applyPendingChanges(position, pendingPositions) {
  if (!pendingPositions) {
    return;
  }
  const { key } = position;

  if (
    pendingPositions[key] &&
    pendingPositions[key].updatedAt &&
    pendingPositions[key].pendingChanges &&
    pendingPositions[key].updatedAt + PENDING_POSITION_VALID_DURATION > Date.now()
  ) {
    const { pendingChanges } = pendingPositions[key];
    if (pendingChanges.size && position.size.eq(pendingChanges.size)) {
      return;
    }

    if (pendingChanges.expectingCollateralChange && !position.collateral.eq(pendingChanges.collateralSnapshot)) {
      return;
    }

    position.hasPendingChanges = true;
    position.pendingChanges = pendingChanges;
  }
}

export function getPositions(
  chainId,
  positionQuery,
  positionData,
  infoTokens,
  includeDelta,
  showPnlAfterFees,
  account,
  pendingPositions,
  updatedPositions
) {
  const propsLength = getConstant(chainId, "positionReaderPropsLength");
  const positions = [];
  const positionsMap = {};
  if (!positionData) {
    return { positions, positionsMap };
  }
  const { collateralTokens, indexTokens, isLong } = positionQuery;

  for (let i = 0; i < collateralTokens.length; i++) {
    const collateralToken = getTokenInfo(infoTokens, collateralTokens[i], true, getContract(chainId, "NATIVE_TOKEN"));
    const indexToken = getTokenInfo(infoTokens, indexTokens[i], true, getContract(chainId, "NATIVE_TOKEN"));
    const key = getPositionKey(account, collateralTokens[i], indexTokens[i], isLong[i]);
    let contractKey;
    if (account) {
      contractKey = getPositionContractKey(account, collateralTokens[i], indexTokens[i], isLong[i]);
    }

    const position = {
      key,
      contractKey,
      collateralToken,
      indexToken,
      isLong: isLong[i],
      size: positionData[i * propsLength],
      collateral: positionData[i * propsLength + 1],
      averagePrice: positionData[i * propsLength + 2],
      entryFundingRate: positionData[i * propsLength + 3],
      cumulativeFundingRate: collateralToken?.cumulativeFundingRate,
      hasRealisedProfit: positionData[i * propsLength + 4].eq(1),
      realisedPnl: positionData[i * propsLength + 5],
      lastIncreasedTime: positionData[i * propsLength + 6].toNumber(),
      hasProfit: positionData[i * propsLength + 7].eq(1),
      delta: positionData[i * propsLength + 8],
      markPrice: isLong[i] ? indexToken?.minPrice : indexToken?.maxPrice,
    };

    if (
      updatedPositions &&
      updatedPositions[key] &&
      updatedPositions[key].updatedAt &&
      updatedPositions[key].updatedAt + UPDATED_POSITION_VALID_DURATION > Date.now()
    ) {
      const updatedPosition = updatedPositions[key];
      position.size = updatedPosition.size;
      position.collateral = updatedPosition.collateral;
      position.averagePrice = updatedPosition.averagePrice;
      position.entryFundingRate = updatedPosition.entryFundingRate;
    }

    let fundingFee = getFundingFee(position);
    position.fundingFee = fundingFee ? fundingFee : bigNumberify(0);
    position.collateralAfterFee = position.collateral.sub(position.fundingFee);

    position.closingFee = position.size.mul(MARGIN_FEE_BASIS_POINTS).div(BASIS_POINTS_DIVISOR);
    position.positionFee = position.size.mul(MARGIN_FEE_BASIS_POINTS).mul(2).div(BASIS_POINTS_DIVISOR);
    position.totalFees = position.positionFee.add(position.fundingFee);

    position.pendingDelta = position.delta;

    if (position.collateral.gt(0)) {
      position.hasLowCollateral =
        position.collateralAfterFee.lt(0) || position.size.div(position.collateralAfterFee.abs()).gt(50);

      if (position.averagePrice && position.markPrice) {
        const priceDelta = position.averagePrice.gt(position.markPrice)
          ? position.averagePrice.sub(position.markPrice)
          : position.markPrice.sub(position.averagePrice);
        position.pendingDelta = position.size.mul(priceDelta).div(position.averagePrice);

        position.delta = position.pendingDelta;

        if (position.isLong) {
          position.hasProfit = position.markPrice.gte(position.averagePrice);
        } else {
          position.hasProfit = position.markPrice.lte(position.averagePrice);
        }
      }

      position.deltaPercentage = position.pendingDelta.mul(BASIS_POINTS_DIVISOR).div(position.collateral);

      const { deltaStr, deltaPercentageStr } = getDeltaStr({
        delta: position.pendingDelta,
        deltaPercentage: position.deltaPercentage,
        hasProfit: position.hasProfit,
      });

      position.deltaStr = deltaStr;
      position.deltaPercentageStr = deltaPercentageStr;
      position.deltaBeforeFeesStr = deltaStr;

      let hasProfitAfterFees;
      let pendingDeltaAfterFees;

      if (position.hasProfit) {
        if (position.pendingDelta.gt(position.totalFees)) {
          hasProfitAfterFees = true;
          pendingDeltaAfterFees = position.pendingDelta.sub(position.totalFees);
        } else {
          hasProfitAfterFees = false;
          pendingDeltaAfterFees = position.totalFees.sub(position.pendingDelta);
        }
      } else {
        hasProfitAfterFees = false;
        pendingDeltaAfterFees = position.pendingDelta.add(position.totalFees);
      }

      position.hasProfitAfterFees = hasProfitAfterFees;
      position.pendingDeltaAfterFees = pendingDeltaAfterFees;
      // while calculating delta percentage after fees, we need to add opening fee (which is equal to closing fee) to collateral
      position.deltaPercentageAfterFees = position.pendingDeltaAfterFees
        .mul(BASIS_POINTS_DIVISOR)
        .div(position.collateral.add(position.closingFee));

      const { deltaStr: deltaAfterFeesStr, deltaPercentageStr: deltaAfterFeesPercentageStr } = getDeltaStr({
        delta: position.pendingDeltaAfterFees,
        deltaPercentage: position.deltaPercentageAfterFees,
        hasProfit: hasProfitAfterFees,
      });

      position.deltaAfterFeesStr = deltaAfterFeesStr;
      position.deltaAfterFeesPercentageStr = deltaAfterFeesPercentageStr;

      if (showPnlAfterFees) {
        position.deltaStr = position.deltaAfterFeesStr;
        position.deltaPercentageStr = position.deltaAfterFeesPercentageStr;
      }

      let netValue = position.hasProfit
        ? position.collateral.add(position.pendingDelta)
        : position.collateral.sub(position.pendingDelta);

      netValue = netValue.sub(position.fundingFee).sub(position.closingFee);
      position.netValue = netValue;
    }

    position.leverage = getLeverage({
      size: position.size,
      collateral: position.collateral,
      entryFundingRate: position.entryFundingRate,
      cumulativeFundingRate: position?.cumulativeFundingRate,
      hasProfit: position.hasProfit,
      delta: position.delta,
      includeDelta,
    });
    position.leverageStr = getLeverageStr(position.leverage);

    positionsMap[key] = position;

    applyPendingChanges(position, pendingPositions);

    if (position.size.gt(0) || position.hasPendingChanges) {
      positions.push(position);
    }
  }
  return { positions, positionsMap };
}

export function getPositionQuery(tokens, nativeTokenAddress) {
  const collateralTokens = [];
  const indexTokens = [];
  const isLong = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.isStable) {
      continue;
    }
    if (token.isWrapped) {
      continue;
    }
    collateralTokens.push(getTokenAddress(token, nativeTokenAddress));
    indexTokens.push(getTokenAddress(token, nativeTokenAddress));
    isLong.push(true);
  }

  for (let i = 0; i < tokens.length; i++) {
    const stableToken = tokens[i];
    if (!stableToken.isStable) {
      continue;
    }

    for (let j = 0; j < tokens.length; j++) {
      const token = tokens[j];
      if (token.isStable) {
        continue;
      }
      if (token.isWrapped) {
        continue;
      }
      collateralTokens.push(stableToken.address);
      indexTokens.push(getTokenAddress(token, nativeTokenAddress));
      isLong.push(false);
    }
  }

  return { collateralTokens, indexTokens, isLong };
}

export const Exchange = forwardRef((props, ref) => {
  const {
    savedIsPnlInLeverage,
    setSavedIsPnlInLeverage,
    savedShowPnlAfterFees,
    savedSlippageAmount,
    pendingTxns,
    setPendingTxns,
    savedShouldShowPositionLines,
    setSavedShouldShowPositionLines,
    connectWallet,
    savedShouldDisableValidationForTesting,
    openSettings,
  } = props;
  const [showBanner, setShowBanner] = useLocalStorageSerializeKey("showBanner", true);
  const [bannerHidden, setBannerHidden] = useLocalStorageSerializeKey("bannerHidden", null);

  const [pendingPositions, setPendingPositions] = useState({});
  const [updatedPositions, setUpdatedPositions] = useState({});

  useEffect(() => {
    if (new Date() > new Date("2021-11-30")) {
      setShowBanner(false);
    } else {
      if (bannerHidden && new Date(bannerHidden) > new Date()) {
        setShowBanner(false);
      } else {
        setBannerHidden(null);
        setShowBanner(true);
      }
    }
  }, [showBanner, bannerHidden, setBannerHidden, setShowBanner]);

  const { active, account, library } = useWeb3React();
  const { chainId } = useChainId();
  const currentAccount = account;

  const nativeTokenAddress = getContract(chainId, "NATIVE_TOKEN");

  const vaultAddress = getContract(chainId, "Vault");
  const positionRouterAddress = getContract(chainId, "PositionRouter");
  const readerAddress = getContract(chainId, "Reader");
  const usdgAddress = getContract(chainId, "USDG");

  const whitelistedTokens = getWhitelistedTokens(chainId);
  const whitelistedTokenAddresses = whitelistedTokens.map((token) => token.address);

  const positionQuery = getPositionQuery(whitelistedTokens, nativeTokenAddress);

  const defaultCollateralSymbol = getConstant(chainId, "defaultCollateralSymbol");
  const defaultTokenSelection = useMemo(
    () => ({
      [SWAP]: {
        from: DEFAULT_TOKEN,
        to: getTokenBySymbol(chainId, defaultCollateralSymbol).address,
      },
      [LONG]: {
        from: DEFAULT_TOKEN,
        to: DEFAULT_TOKEN,
      },
      [SHORT]: {
        from: getTokenBySymbol(chainId, defaultCollateralSymbol).address,
        to: DEFAULT_TOKEN,
      },
    }),
    [chainId, defaultCollateralSymbol]
  );

  const [tokenSelection, setTokenSelection] = useLocalStorageByChainId(
    chainId,
    "Exchange-token-selection-v2",
    defaultTokenSelection
  );
  const [swapOption, setSwapOption] = useLocalStorageByChainId(chainId, "Swap-option-v2", LONG);

  const fromTokenAddress = tokenSelection[swapOption].from;
  const toTokenAddress = tokenSelection[swapOption].to;

  const setFromTokenAddress = useCallback(
    (selectedSwapOption, address) => {
      const newTokenSelection = JSON.parse(JSON.stringify(tokenSelection));
      newTokenSelection[selectedSwapOption].from = address;
      setTokenSelection(newTokenSelection);
    },
    [tokenSelection, setTokenSelection]
  );

  const setToTokenAddress = useCallback(
    (selectedSwapOption, address) => {
      const newTokenSelection = JSON.parse(JSON.stringify(tokenSelection));
      newTokenSelection[selectedSwapOption].to = address;
      if (selectedSwapOption === LONG || selectedSwapOption === SHORT) {
        newTokenSelection[LONG].to = address;
        newTokenSelection[SHORT].to = address;
      }
      setTokenSelection(newTokenSelection);
    },
    [tokenSelection, setTokenSelection]
  );

  const setMarket = (selectedSwapOption, toTokenAddress) => {
    setSwapOption(selectedSwapOption);
    const newTokenSelection = JSON.parse(JSON.stringify(tokenSelection));
    newTokenSelection[selectedSwapOption].to = toTokenAddress;
    if (selectedSwapOption === LONG || selectedSwapOption === SHORT) {
      newTokenSelection[LONG].to = toTokenAddress;
      newTokenSelection[SHORT].to = toTokenAddress;
    }
    setTokenSelection(newTokenSelection);
  };

  const [isConfirming, setIsConfirming] = useState(false);
  const [isPendingConfirmation, setIsPendingConfirmation] = useState(false);

  const tokens = getTokens(chainId);

  const tokenAddresses = tokens.map((token) => token.address);
  const { data: tokenBalances } = useSWR(active && [active, chainId, readerAddress, "getTokenBalances", account], {
    fetcher: contractFetcher(library, Reader, [tokenAddresses]),
  });

  const { data: positionData, error: positionDataError } = useSWR(
    active && [active, chainId, readerAddress, "getPositions", vaultAddress, account],
    {
      fetcher: contractFetcher(library, Reader, [
        positionQuery.collateralTokens,
        positionQuery.indexTokens,
        positionQuery.isLong,
      ]),
    }
  );
  const positionsDataIsLoading = active && !positionData && !positionDataError;

  const { data: fundingRateInfo } = useSWR([active, chainId, readerAddress, "getFundingRates"], {
    fetcher: contractFetcher(library, Reader, [vaultAddress, nativeTokenAddress, whitelistedTokenAddresses]),
  });

  const { data: totalTokenWeights } = useSWR(
    [`Exchange:totalTokenWeights:${active}`, chainId, vaultAddress, "totalTokenWeights"],
    {
      fetcher: contractFetcher(library, VaultV2),
    }
  );

  const { data: usdgSupply } = useSWR([`Exchange:usdgSupply:${active}`, chainId, usdgAddress, "totalSupply"], {
    fetcher: contractFetcher(library, Token),
  });

  const orderBookAddress = getContract(chainId, "OrderBook");
  const routerAddress = getContract(chainId, "Router");
  const { data: orderBookApproved } = useSWR(
    active && [active, chainId, routerAddress, "approvedPlugins", account, orderBookAddress],
    {
      fetcher: contractFetcher(library, Router),
    }
  );

  const { data: positionRouterApproved } = useSWR(
    active && [active, chainId, routerAddress, "approvedPlugins", account, positionRouterAddress],
    {
      fetcher: contractFetcher(library, Router),
    }
  );

  const { infoTokens } = useInfoTokens(library, chainId, active, tokenBalances, fundingRateInfo);

  console.log("infoTokenádsdfs :>> ", infoTokens);
  const { minExecutionFee, minExecutionFeeUSD, minExecutionFeeErrorMessage } = useExecutionFee(
    library,
    active,
    chainId,
    infoTokens
  );

  useEffect(() => {
    const fromToken = getTokenInfo(infoTokens, fromTokenAddress);
    const toToken = getTokenInfo(infoTokens, toTokenAddress);
    let selectedToken = getChartToken(swapOption, fromToken, toToken, chainId);
    let currentTokenPriceStr = formatAmount(selectedToken.maxPrice, USD_DECIMALS, 2, true);
    let title = getPageTitle(
      currentTokenPriceStr + ` | ${selectedToken.symbol}${selectedToken.isStable ? "" : "-USD"}`
    );
    document.title = title;
  }, [tokenSelection, swapOption, infoTokens, chainId, fromTokenAddress, toTokenAddress]);
  const { positions, positionsMap } = getPositions(
    chainId,
    positionQuery,
    positionData,
    infoTokens,
    savedIsPnlInLeverage,
    savedShowPnlAfterFees,
    account,
    pendingPositions,
    updatedPositions
  );

  useImperativeHandle(ref, () => ({
    onUpdatePosition(key, size, collateral, averagePrice, entryFundingRate, reserveAmount, realisedPnl) {
      for (let i = 0; i < positions.length; i++) {
        const position = positions[i];
        if (position.contractKey === key) {
          updatedPositions[position.key] = {
            size,
            collateral,
            averagePrice,
            entryFundingRate,
            reserveAmount,
            realisedPnl,
            updatedAt: Date.now(),
          };
          setUpdatedPositions({ ...updatedPositions });
          break;
        }
      }
    },
    onClosePosition(key, size, collateral, averagePrice, entryFundingRate, reserveAmount, realisedPnl, e) {
      for (let i = 0; i < positions.length; i++) {
        const position = positions[i];
        if (position.contractKey === key) {
          updatedPositions[position.key] = {
            size: bigNumberify(0),
            collateral: bigNumberify(0),
            averagePrice,
            entryFundingRate,
            reserveAmount,
            realisedPnl,
            updatedAt: Date.now(),
          };
          setUpdatedPositions({ ...updatedPositions });
          break;
        }
      }
    },

    onIncreasePosition(key, account, collateralToken, indexToken, collateralDelta, sizeDelta, isLong, price, fee, e) {
      if (account !== currentAccount) {
        return;
      }

      const indexTokenItem = getToken(chainId, indexToken?.toLowerCase());
      const tokenSymbol = indexTokenItem.isWrapped ? getConstant(chainId, "nativeTokenSymbol") : indexTokenItem.symbol;
      const longOrShortText = isLong ? t`Long` : t`Short`;
      let message;
      if (sizeDelta.eq(0)) {
        message = t`Deposited ${formatAmount(
          collateralDelta,
          USD_DECIMALS,
          2,
          true
        )} USD into ${tokenSymbol} ${longOrShortText}`;
      } else {
        message = t`Increased ${tokenSymbol} ${longOrShortText}, +${formatAmount(
          sizeDelta,
          USD_DECIMALS,
          2,
          true
        )} USD.`;
      }

      pushSuccessNotification(chainId, message, e);
    },

    onDecreasePosition(key, account, collateralToken, indexToken, collateralDelta, sizeDelta, isLong, price, fee, e) {
      if (account !== currentAccount) {
        return;
      }

      const indexTokenItem = getToken(chainId, indexToken?.toLowerCase());
      const tokenSymbol = indexTokenItem.isWrapped ? getConstant(chainId, "nativeTokenSymbol") : indexTokenItem.symbol;
      const longOrShortText = isLong ? t`Long` : t`Short`;

      let message;
      if (sizeDelta.eq(0)) {
        message = t`Withdrew ${formatAmount(
          collateralDelta,
          USD_DECIMALS,
          2,
          true
        )} USD from ${tokenSymbol} ${longOrShortText}.`;
      } else {
        message = t`Decreased ${tokenSymbol} ${longOrShortText}, -${formatAmount(
          sizeDelta,
          USD_DECIMALS,
          2,
          true
        )} USD.`;
      }

      pushSuccessNotification(chainId, message, e);
    },

    onCancelIncreasePosition(
      account,
      path,
      indexToken,
      amountIn,
      minOut,
      sizeDelta,
      isLong,
      acceptablePrice,
      executionFee,
      blockGap,
      timeGap,
      e
    ) {
      if (account !== currentAccount) {
        return;
      }
      const indexTokenItem = getToken(chainId, indexToken?.toLowerCase());
      const tokenSymbol = indexTokenItem.isWrapped ? getConstant(chainId, "nativeTokenSymbol") : indexTokenItem.symbol;
      const longOrShortText = isLong ? t`Long` : t`Short`;

      const message = t`Could not increase ${tokenSymbol} ${longOrShortText} within the allowed slippage, you can adjust the allowed slippage in the settings on the top right of the page.`;
      pushErrorNotification(chainId, message, e);

      const key = getPositionKey(account, path[path.length - 1], indexToken?.toLowerCase(), isLong);
      pendingPositions[key] = {};
      setPendingPositions({ ...pendingPositions });
    },

    onCancelDecreasePosition(
      account,
      path,
      indexToken,
      collateralDelta,
      sizeDelta,
      isLong,
      receiver,
      acceptablePrice,
      minOut,
      executionFee,
      blockGap,
      timeGap,
      e
    ) {
      if (account !== currentAccount) {
        return;
      }
      const indexTokenItem = getToken(chainId, indexToken?.toLowerCase());
      const tokenSymbol = indexTokenItem.isWrapped ? getConstant(chainId, "nativeTokenSymbol") : indexTokenItem.symbol;
      const longOrShortText = isLong ? t`Long` : t`Short`;

      const message = t`Could not decrease ${tokenSymbol} ${longOrShortText} within the allowed slippage, you can adjust the allowed slippage in the settings on the top right of the page.`;

      pushErrorNotification(chainId, message, e);

      const key = getPositionKey(account, path[path.length - 1], indexToken?.toLowerCase(), isLong);
      pendingPositions[key] = {};
      setPendingPositions({ ...pendingPositions });
    },
  }));

  const flagOrdersEnabled = true;
  const [orders] = useAccountOrders(flagOrdersEnabled);
  // console.log("exchange_orders", orders);

  const [isWaitingForPluginApproval, setIsWaitingForPluginApproval] = useState(false);
  const [isWaitingForPositionRouterApproval, setIsWaitingForPositionRouterApproval] = useState(false);
  const [isPluginApproving, setIsPluginApproving] = useState(false);
  const [isPositionRouterApproving, setIsPositionRouterApproving] = useState(false);
  const [isCancelMultipleOrderProcessing, setIsCancelMultipleOrderProcessing] = useState(false);
  const [cancelOrderIdList, setCancelOrderIdList] = useState([]);

  const onMultipleCancelClick = useCallback(
    async function () {
      setIsCancelMultipleOrderProcessing(true);
      try {
        const tx = await cancelMultipleOrders(chainId, library, cancelOrderIdList, {
          successMsg: t`Orders cancelled.`,
          failMsg: t`Cancel failed.`,
          sentMsg: t`Cancel submitted.`,
          pendingTxns,
          setPendingTxns,
        });
        const receipt = await tx.wait();
        if (receipt.status === 1) {
          setCancelOrderIdList([]);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
      } finally {
        setIsCancelMultipleOrderProcessing(false);
      }
    },
    [
      chainId,
      library,
      pendingTxns,
      setPendingTxns,
      setCancelOrderIdList,
      cancelOrderIdList,
      setIsCancelMultipleOrderProcessing,
    ]
  );

  const approveOrderBook = () => {
    setIsPluginApproving(true);
    return approvePlugin(chainId, orderBookAddress, {
      library,
      pendingTxns,
      setPendingTxns,
      sentMsg: t`Enable orders sent.`,
      failMsg: t`Enable orders failed.`,
    })
      .then(() => {
        setIsWaitingForPluginApproval(true);
      })
      .finally(() => {
        setIsPluginApproving(false);
      });
  };

  const approvePositionRouter = ({ sentMsg, failMsg }) => {
    setIsPositionRouterApproving(true);
    return approvePlugin(chainId, positionRouterAddress, {
      library,
      pendingTxns,
      setPendingTxns,
      sentMsg,
      failMsg,
    })
      .then(() => {
        setIsWaitingForPositionRouterApproval(true);
      })
      .finally(() => {
        setIsPositionRouterApproving(false);
      });
  };

  return <div className="Exchange page-layout"></div>;
});
