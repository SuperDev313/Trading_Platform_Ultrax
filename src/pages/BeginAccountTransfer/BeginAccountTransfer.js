import React, { useState } from 'react'
import {Link} from 'react-router-dom'
import useSWR from 'swr'
import { Trans, t } from '@lingui/macro'
import Modal from 'components/Modal/Modal'
import { useChainId } from 'lib/chains'
import { getContract } from 'config/contracts'
import { contractFetcher } from 'lib/contracts'

export default function BeginAccountTransfer(props) {
    const { setPendingTxns } = props;
    const { active, library, account } = useWeb3React();
    const { chainId } = useChainId();
  
    const [receiver, setReceiver] = useState("");
    const [isTransferring, setIsTransferring] = useState(false);
    const [isApproving, setIsApproving] = useState(false);

    const [isTransferSubmittedModalVisible, setIsTransferSubmittedModalVisible] = useState(false)

    if (ethers.utils.isAddress(receiver)) {
        parseReceiver = receiver;
    }

    const utxAddress = getContract(chainId, "UTX")
    const utxVesterAddress = getContract(chainId, "UtxVester")
    const ulpVesterAddress = getContract(chainId, "UlpVester")
    const rewardRouterAddress = getContract(chainId, "RewardRouter")
    let parseReceiver = ethers.contants.AddressZero;

    // Fetching data using SWR
    const { data: utxVesterBalance } = useSWR(active && [ active, chainId, utxVesterAddress, "balanceOf", account], {
        fetcher: contractFetcher(library, Token),
    })

    const { data: ulpVesterBalance } = useSWR(active && [active, chainId, ulpVesterAddress, "balanceOf", account], {
        fetcher: contractFetcher(library, Token),
      });
    
      const stakedUtxTrackerAddress = getContract(chainId, "StakedUtxTracker");
      const { data: cumulativeUtxRewards } = useSWR(
        [active, chainId, stakedUtxTrackerAddress, "cumulativeRewards", parsedReceiver],
        {
          fetcher: contractFetcher(library, RewardTracker),
        }
      );

      const { data: transferredCumulativeUtxRewards } = useSWR(
        [active, chainId, utxVesterAddress, "transferredCumulativeRewards", parsedReceiver],
        {
          fetcher: contractFetcher(library, Vester),
        }
      );
    
      const { data: transferredCumulativeUlpRewards } = useSWR(
        [active, chainId, ulpVesterAddress, "transferredCumulativeRewards", parsedReceiver],
        {
          fetcher: contractFetcher(library, Vester),
        }
      );
    
      const { data: pendingReceiver } = useSWR(
        active && [active, chainId, rewardRouterAddress, "pendingReceivers", account],
        {
          fetcher: contractFetcher(library, RewardRouter),
        }
      );
    
      const { data: utxAllowance } = useSWR(
        active && [active, chainId, utxAddress, "allowance", account, stakedUtxTrackerAddress],
        {
          fetcher: contractFetcher(library, Token),
        }
      );
    
      const { data: utxStaked } = useSWR(
        active && [active, chainId, stakedUtxTrackerAddress, "depositBalances", account, utxAddress],
        {
          fetcher: contractFetcher(library, RewardTracker),
        }
      );

      const needApproval = utxAllowance && utxStaked && utxStaked.gt(utxAllowance);

      const hasVestedUtx = utxVesterBalance && utxVesterBalance.gt(0);
      const hasVestedUlp = ulpVesterBalance && ulpVesterBalance.gt(0);
      const hasStakedUtx =
        (cumulativeUtxRewards && cumulativeUtxRewards.gt(0)) ||
        (transferredCumulativeUtxRewards && transferredCumulativeUtxRewards.gt(0));
      const hasStakedUlp =
        (cumulativeUlpRewards && cumulativeUlpRewards.gt(0)) ||
        (transferredCumulativeUlpRewards && transferredCumulativeUlpRewards.gt(0));
      const hasPendingReceiver = pendingReceiver && pendingReceiver !== ethers.constants.AddressZero;
    
      const getError = () => {
        if (!account) {
            return t`Wallet is not connected`;
        }
        if (hasVestedUtx) {
            return t`Vested UTX not withdrawn`;
          }
          if (hasVestedUlp) {
            return t`Vested ULP not withdrawn`;
          }
          if (!receiver || receiver.length === 0) {
            return t`Transfer Account`;
          }
          if (!ethers.utils.isAddress(receiver)) {
            return t`Invalid Receiver Address`;
          }
          if (hasStakedUtx || hasStakedUlp) {
            return t`Invalid Receiver`;
          }
          if ((parsedReceiver || "").toString().toLowerCase() === (account || "").toString().toLowerCase()) {
            return t`Self-transfer not supported`;
          }
      
          if (
            (parsedReceiver || "").length > 0 &&
            (parsedReceiver || "").toString().toLowerCase() === (pendingReceiver || "").toString().toLowerCase()
          ) {
            return t`Transfer already initiated`;
          }
      }
      const isPrimaryEnabled = () => {
        const error = getError();
        if (error) {
            return false;
        }
        if (isApproving) {
            return false;
        }
        if (isTransferring) {
            return false;
        }
        return true;
      }
      
    const getPrimaryText = () => {
        const error = getError();
        if (error) {
          return error;
        }
        if (needApproval) {
          return t`Approve UTX`;
        }
        if (isApproving) {
          return t`Approving...`;
        }
        if (isTransferring) {
          return t`Transferring`;
        }
    
        return t`Begin Transfer`;
      };

    const onClickPrimary = () => {
        if (needApproval) {
            approveTokens({
                setIsApproving,
                library, 
                tokenAddress: utxAddress,
                spender: stakedUtxTrackerAddress,
                chainId,
            })
            return;
        }
    }

    setIsTransferring(true);
    const contract = new ethers.Contract(rewardRouterAddress, RewardRouter.abi, library.getSigner());

    callContract(chainId, contract, "signalTransfer", [parsedReceiver], {
      sentMsg: t`Transfer submitted!`,
      failMsg: t`Transfer failed.`,
      setPendingTxns,
    })
      .then(async (res) => {
        setIsTransferSubmittedModalVisible(true);
      })
      .finally(() => {
        setIsTransferring(false);
      });
    };

    const completeTransferLink = `/complete_account_transfer/${account}/${parsedReceiver}`;
    const pendingTransferLink = `/complete_account_transfer/${account}/${pendingReceiver}`;

    return (
        <div className ="BeginAccountTransfer Page page-layout">
            <Modal 
                isVisible={isTransferSubmittedModalVisible}
                setIsVisivle={setIsTransferSubmittedModalVisible}
                label={t`Transfer Submitted`}
            >
                <Trans>Your transfer has been initiated.</Trans>
                <br />
                <br />
                <Link className="App-cta" to={completeTransferLink}>
                    <Trans>Continue</Trans>
                </Link>
            </Modal>
            <div className="Page-title-section">
                <div className="Page-title">
                <Trans>Transfer Account</Trans>
                </div>
                <div className="Page-description">
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div>
                    Please note that this transfer method is intended for full account transfers only. The following rules
                    apply:
                    </div>
                    <div>- This will transfer all your UTX, esUTX, ULP and Multiplier Points to your new account.</div>

                    <div>- Transfers are only supported if the receiving account has not staked UTX or ULP tokens before.</div>
                    <div>
                    - Transfers are one-way, you will not be able to transfer staked tokens back to the sending account.
                    </div>
                </div>
                </div>
                {
                    hasPendingReceiver && (
                        <div className="Page-description">
                            <Trans>
                                You have <Link to={pendingTransferLink}pending transfer></Link>to {pendingReceiver}.
                            </Trans>
                        </div>
                    )
                }
            </div>
            <div className="Page-content">
                <div className="input-form">
                <div className="input-row">
                    <label className="input-label">
                    <Trans>Receiver Address</Trans>
                    </label>
                    <div>
                    <input
                        type="text"
                        value={receiver}
                        onChange={(e) => setReceiver(e.target.value)}
                        className="text-input"
                    />
                    </div>
                </div>
                <div className="BeginAccountTransfer-validations">
                    <ValidationRow isValid={!hasVestedUtx}>
                    <Trans>Sender has withdrawn all tokens from UTX Vesting Vault</Trans>
                    </ValidationRow>
                    <ValidationRow isValid={!hasVestedUlp}>
                    <Trans>Sender has withdrawn all tokens from ULP Vesting Vault</Trans>
                    </ValidationRow>
                    <ValidationRow isValid={!hasStakedUtx}>
                    <Trans>Receiver has not staked UTX tokens before</Trans>
                    </ValidationRow>
                    <ValidationRow isValid={!hasStakedUlp}>
                    <Trans>Receiver has not staked ULP tokens before</Trans>
                    </ValidationRow>
                </div>
                <div className="input-row">
                    <Button
                    variant="primary-action"
                    className="w-full"
                    disabled={!isPrimaryEnabled()}
                    onClick={() => onClickPrimary()}
                    style={{
                        display: "flex",
                        width: "256px",
                        padding: "14px 28px",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "10px",
                        borderRadius: "4px",
                        background: "var(--bg-accent)",
                        fontSize: "16px",
                        minWidth: "300px",
                    }}
                    >
                    {getPrimaryText()}
                    </Button>
                </div>
                </div>
            </div>
        </div>
    )
} 