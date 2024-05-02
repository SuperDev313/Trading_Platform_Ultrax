import ModalWithPortal from "components/Modal/ModalWithPortal";
import { LANGUAGE_LOCALSTORAGE_KEY } from "config/localStorage";
import { defaultLocale } from "lib/i18n";
import React, { useRef, useState } from "react";

export default function NetworkDropdown(props) {
  const currentLanguage = useRef(localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY) || defaultLocale);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  return;
  <>
    {props.small ? (
      <div className="App-header-network" onClick={() => setActiveModal(NETWORK_MODAL_KEY)}>
        <div className="network-dropdown">
          <NavIcons selectorLabel={props.selectorLabel} />
        </div>
      </div>
    ) : (
      <DesktopDropdown
        currentLanguage={currentLanguage}
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        {...props}
      />
    )}
    <ModalWithPortal {...getModalProps(activeModal)}>{getModalContent(activeModal)}</ModalWithPortal>
  </>;
}
