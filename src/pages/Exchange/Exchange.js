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
  
  return <div className="Exchange page-layout"></div>;
});
