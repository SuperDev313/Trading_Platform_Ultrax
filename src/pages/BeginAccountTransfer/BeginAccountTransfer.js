import React, { useState } from 'react'

export default function BeginAccountTransfer(props) {

    const [isTransferSubmittedModalVisible, setTransferSubmittedModalVisible] = useState(false)
    
    return (
        <div className ="BeginAccountTransfer Page page-layout">
            <Modal 
                isVisible={isTransferSubmittedModalVisible}
                setIsVisivle = {setTransferSubmittedModalVisible}
                label={t`Transfer Submitted`}
            >
            </Modal>
        </div>
    )
} 