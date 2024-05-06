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
    </div>
  );
}
