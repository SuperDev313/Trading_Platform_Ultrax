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

function getExecutionFeeStr(chainId, executionFee, executionFeeUsd) {
  const nativeTokenSymbol = getConstant(chainId, "nativeTokenSymbol");

  if (!nativeTokenSymbol || !executionFee || !executionFeeUsd) {
    return "";
  }

  const formattedExecutionFee = formatAmountFree(executionFee, 18, 5);
  const formattedExecutionFeeUsd = formatAmount(executionFeeUsd, USD_DECIMALS, 2);
  return `${formattedExecutionFee} ${nativeTokenSymbol} ($${formattedExecutionFeeUsd})`;
}

function getFeeLabel(type: FeeType) {
  const labels = {
    close: t`Close Fee`,
    open: t`Open Fee`,
    swap: t`Swap Fee`,
    borrow: t`Borrow Fee`,
    deposit: t`Deposit Fee`,
    execution: t`Execution Fee`,
  };
  return labels[type];
}

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
