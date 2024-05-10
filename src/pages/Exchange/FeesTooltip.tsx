import { t, Trans } from "@lingui/macro";
import ExternalLink from "components/ExternalLink/ExternalLink";
import StatsTooltipRow from "components/StatsTooltip/StatsTooltipRow";
import Tooltip from "components/Tooltip/Tooltip";
import { getConstant } from "config/chains";
import { BigNumber } from "ethers";
import { useChainId } from "lib/chains";
import { USD_DECIMALS } from "lib/legacy";
import { formatAmount, formatAmountFree } from "lib/numbers";

type Fee = { label: string; value: string };
type ExecutionFees = { fee?: BigNumber; feeUsd?: BigNumber };
type FeeType = "open" | "close" | "swap" | "borrow" | "deposit" | "execution";

function FeesTooltip({
  fundingFee,
  positionFee,
  swapFee,
  executionFees,
  depositFee,
  fundingRate,
  isOpening = true,
  titleText = "",
  isNoTooltip,
}: Props) {
  const { chainId } = useChainId();
  const executionFee = executionFees?.fee;
  const executionFeeUsd = executionFees?.feeUsd;
  const formattedFees = {
    swap: getFeesStr(swapFee),
    position: getFeesStr(positionFee),
    deposit: getFeesStr(depositFee),
    execution: getExecutionFeeStr(chainId, executionFee, executionFeeUsd),
    funding: getFeesStr(fundingFee),
    fundingRate,
  };

  const feesRows = getFeesRows(isOpening, formattedFees);
  const totalFees = getTotalFees([executionFees?.feeUsd, swapFee, positionFee, depositFee, fundingFee]);
  if (isNoTooltip) {
    return (
      <div className="text-primary">
        {totalFees?.gt(0) ? `$${formatAmount(totalFees, USD_DECIMALS, 2, true)}` : "-"}
      </div>
    );
  }

  return (
    <Tooltip
      position="right-top"
      className="PositionSeller-fees-tooltip"
      handle={<div>{totalFees?.gt(0) ? `$${formatAmount(totalFees, USD_DECIMALS, 2, true)}` : "-"}</div>}
      renderContent={() => (
        <div>
          {titleText && <p>{titleText}</p>}
          {feesRows.map(({ label, value }) => (
            <StatsTooltipRow key={label} label={label} showDollar={false} value={value} />
          ))}
          <br />
        </div>
      )}
    />
  );
}

export default FeesTooltip;
