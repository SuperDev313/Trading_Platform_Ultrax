import React, { useRef, useState } from "react";
import ModalWithPortal from "../Modal/ModalWithPortal";
import { t } from "@lingui/macro";
import cx from "classnames";
import "./NetworkDropdown.css";
import language24Icon from "img/ic_language24.svg";
import { isHomeSite } from "lib/legacy";
import { defaultLocale } from "lib/i18n";
import { LANGUAGE_LOCALSTORAGE_KEY } from "config/localStorage";
import LanguageModalContent from "./LanguageModalContent";

export default function LanguagePopupHome() {
    const currentLanguage = useRef(localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY) || defaultLocale)
    const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false)

    return (
        <>
            <div  className="App-header-network App-header-language">

            </div>
        </>
    )
}