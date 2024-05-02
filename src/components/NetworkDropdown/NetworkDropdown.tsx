import React, { useRef, useState } from "react";
import { Menu } from "@headlessui/react";
import ModalWithPortal from "../Modal/ModalWithPortal";
import { t, Trans } from "@lingui/macro";
import cx from "classnames";
import { HiDotsVertical } from "react-icons/hi";
import "./NetworkDropdown.css";
import language24Icon from "img/ic_language24.svg";
import settingsIcon from "img/ic_settings_16.svg";
import { defaultLocale } from "lib/i18n";
import { LANGUAGE_LOCALSTORAGE_KEY } from "config/localStorage";
import LanguageModalContent from "./LanguageModalContent";
import { useChainId } from "lib/chains";
import { getIcon } from "config/icons";
import { FaChevronDown } from "react-icons/fa";

const LANGUAGE_MODAL_KEY: string = "LANGUAGE";
const NETWORK_MODAL_KEY: string = "NETWORK";

export default function NetworkDropdown(props) {
  const currentLanguage = useRef(localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY) || defaultLocale);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  function getModalContent(modalName) {
    switch (modalName) {
      case NETWORK_MODAL_KEY:
        return (
          <NetworkModalContent
            setActiveModal={setActiveModal}
            networkOptions={props.networkOptions}
            onNetworkSelect={props.onNetworkSelect}
            selectorLabel={props.selectorLabel}
            openSettings={props.openSettings}
          />
        );
      default:
        return;
    }
  }

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
