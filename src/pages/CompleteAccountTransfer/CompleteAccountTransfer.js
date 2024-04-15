import Modal from "components/Modal/Modal";
import React from "react";

export default function CompleteAccountTransfer(props) {
  return (
    <div className="CompleteAccountTransfer Page page-layout">
      <Modal
        isVisible={isTransferSubmittedModalVisible}
        setIsVisible={setIsTransferSubmittedModalVisible}
        label="Transfer Completed"
      >
        <Trans>Your transfer has been completed. </Trans>
        <br />
        <br />
        <Link className="App-cta" to="/earn">
          <Trans>Continue</Trans>
        </Link>
      </Modal>
      <div className="Page-title-section">
        <div className="Page-title">
          <Trans>Complete Account Transfer</Trans>
        </div>
        {!isCorrectAccount && (
          <div className="Page-description">
            <Trans>To complete the transfer, you must switch your connected account to {receiver}.</Trans>
            <br />
            <br />
            <Trans>
              You will need to be on this page to accept the transfer,{" "}
              <span
                onClick={() => {
                  copyToClipboard(window.location.href);
                  helperToast.success("Link copied to your clipboard");
                }}
              >
                click here
              </span>{" "}
              to copy the link to this page if needed.
            </Trans>
            <br />
            <br />
          </div>
        )}
        {isCorrectAccount && (
          <div className="Page-description">
            <Trans>You have a pending transfer from</Trans>
            <br />
          </div>
        )}
      </div>
      {isCorrectAccount && (
        <div className="Page-content">
          <div className="input-form">
            <div className="input-row">
              <Button
                variant="primary-action"
                className="w-full"
                disabled={!isPrimaryEnabled()}
                onClick={onClickPrimary}
              >
                {getPrimaryText()}
              </Button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}
