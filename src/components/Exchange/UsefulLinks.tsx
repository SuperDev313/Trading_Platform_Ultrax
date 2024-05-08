import { Trans } from "@lingui/macro";

export default function UsefulLinks({ className }) {
  const { chainId } = useChainId();
  const leaderBoardLink = getLeaderboardLink(chainId);
  const classNames = cx("Exchange-swap-market-box App-box App-box-border", className);
  
  return (
    <div className={className}>
      <div className="Exchange-swap-market-box-title">
        <Trans>Useful Links</Trans>
      </div>
    </div>
  );
}
