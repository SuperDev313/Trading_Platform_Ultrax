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
        </div>
    )
} 