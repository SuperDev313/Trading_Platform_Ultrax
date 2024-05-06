import { formatAmount } from "lib/numbers";
import { useEagerConnect, useInactiveListener } from "lib/wallets";

export default function Migration() {
  const [isMigrationModalVisible, setIsMigrationModalVisible] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [migrationIndex, setMigrationIndex] = useState(0);
  const [migrationValue, setMigrationValue] = useState("");

  const { connector, activate, active, account, library } = useWeb3React();
  const [activatingConnector, setActivatingConnector] = useState();

  const triedEager = useEagerConnect();
  useInactiveListener(!triedEager || !!activatingConnector);
  const connectWallet = getConnectWalletHandler(activate);

  const tokenAddresses = tokens.map((token) => token.address);
  const iouTokenAddresses = tokens.map((token) => token.iouToken);

  const { data: iouBalances, mutate: updateIouBalances } = useSWR(
    ["Migration:iouBalances", CHAIN_ID, readerAddress, "getTokenBalancesWithSupplies", account || AddressZero],
    {
      fetcher: contractFetcher(library, Reader, [iouTokenAddresses]),
    }
  );

  const { data: balances, mutate: updateBalances } = useSWR(
    ["Migration:balances", CHAIN_ID, readerAddress, "getTokenBalancesWithSupplies", account || AddressZero],
    {
      fetcher: contractFetcher(library, Reader, [tokenAddresses]),
    }
  );

  const { data: migratedAmounts, mutate: updateMigratedAmounts } = useSWR(
    ["Migration:migratedAmounts", CHAIN_ID, utxMigratorAddress, "getTokenAmounts"],
    {
      fetcher: contractFetcher(library, UtxMigrator, [tokenAddresses]),
    }
  );

  let utxBalance;
  let totalMigratedUtx;
  let totalMigratedUsd;

  if (iouBalances) {
    utxBalance = bigNumberify(0);
    totalMigratedUtx = bigNumberify(0);

    for (let i = 0; i < iouBalances.length / 2; i++) {
      utxBalance = utxBalance.add(iouBalances[i * 2]);
      totalMigratedUtx = totalMigratedUtx.add(iouBalances[i * 2 + 1]);
    }

    totalMigratedUsd = totalMigratedUtx.mul(utxPrice);
  }

  useEffect(() => {
    if (active) {
      library.on("block", () => {
        updateBalances(undefined, true);
        updateIouBalances(undefined, true);
        updateMigratedAmounts(undefined, true);
      });
      return () => {
        library.removeAllListeners("block");
      };
    }
  }, [active, library, updateBalances, updateIouBalances, updateMigratedAmounts]);

  return (
    <div className="Migration Page">
      <MigrationModal
        isVisible={isMigrationModalVisible}
        setIsVisible={setIsMigrationModalVisible}
        isPendingApproval={isPendingApproval}
        setIsPendingApproval={setIsPendingApproval}
        value={migrationValue}
        setValue={setMigrationValue}
        index={migrationIndex}
        balances={balances}
        active={active}
        account={account}
        library={library}
      />
      <div>
        <div className="Stake-title App-hero">
          <div className="Stake-title-primary App-hero-primary">
            ${formatAmount(totalMigratedUsd, decimals + 18, 0, true)}
          </div>
          <div className="Stake-title-secondary">
            <Trans>Total Assets Migrated</Trans>
          </div>
        </div>
      </div>

      <div className="Migration-note">
        <Trans>Your wallet: {formatAmount(utxBalance, 18, 4, true)}</Trans> UTX
      </div>

      <div className="Migration-cards">
        {tokens.map((token, index) => {
          const { cap, price, bonus } = token;
          const hasCap = cap.lt(MaxUint256);
          return (
            <div className={cx("border", "App-card", { primary: index === 0 })} key={index}>
              <div className="Stake-card-title App-card-title">{token.name}</div>
              <div className="Stake-card-bottom App-card-content">
                <div className="Stake-info App-card-row">
                  <div className="label">
                    <Trans>Wallet</Trans>
                  </div>
                  <div>{formatArrayAmount(balances, index * 2, 18, 4, true)}</div>
                </div>
                <div className="Stake-info App-card-row">
                  <div className="label">
                    <Trans>Migration Price</Trans>
                  </div>
                  <div>${formatAmount(price, decimals, 2, true)}</div>
                </div>
                <div className="Stake-info App-card-row">
                  <div className="label">
                    <Trans>Bonus Tokens</Trans>
                  </div>
                  <div>{parseFloat(bonus).toFixed(2)}%</div>
                </div>
                <div className="Stake-info App-card-row">
                  <div className="label">
                    <Trans>Migrated</Trans>
                  </div>
                  {!hasCap && <div>{formatArrayAmount(migratedAmounts, index, 18, 0, true)}</div>}
                  {hasCap && (
                    <div>
                      {formatArrayAmount(migratedAmounts, index, 18, 0, true)} / {formatAmount(cap, 18, 0, true)}
                    </div>
                  )}
                </div>
                <div className="App-card-options">
                  {!active && (
                    <button className="App-button-option App-card-option" onClick={connectWallet}>
                      <Trans>Connect Wallet</Trans>
                    </button>
                  )}
                  {active && (
                    <button className="App-button-option App-card-option" onClick={() => showMigrationModal(index)}>
                      <Trans>Migrate</Trans>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Footer />
    </div>
  );
}
