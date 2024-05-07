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

export const Exchange = forwardRef((props, ref) => {
  return <div className="Exchange page-layout"></div>;
});
