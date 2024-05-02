import { LANGUAGE_LOCALSTORAGE_KEY } from "config/localStorage";
import { defaultLocale } from "lib/i18n";
import React, { useRef, useState } from "react";

export default function NetworkDropdown(props) {
  const currentLanguage = useRef(localStorage.getItem(LANGUAGE_LOCALSTORAGE_KEY) || defaultLocale);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  return <></>;
}
