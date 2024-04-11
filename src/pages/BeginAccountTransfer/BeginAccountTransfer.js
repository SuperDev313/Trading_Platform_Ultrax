import React, { useState } from 'react'
import {Link} from 'react-router-dom'
import useSWR from 'swr'
import { Trans, t } from '@lingui/macro'
import Modal from 'components/Modal/Modal'

export default function BeginAccountTransfer(props) {

    const [isTransferSubmittedModalVisible, setIsTransferSubmittedModalVisible] = useState(false)

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