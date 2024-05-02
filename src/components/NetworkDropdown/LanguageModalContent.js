import { LANGUAGE_LOCALSTORAGE_KEY } from "config/localStorage";
import { dynamicActivate } from "lib/i18n";

export default function LanguageModalContent({ currentLanguage }) {
  return (
    <div
      key={item}
      className={CSSSkewX("network-dropdown-menu-item menu-item language-modal-item", {
        active: currentLanguage.current === item,
      })}
      onClick={() => {
        if (!isTestLanguage(item)) {
          localStorage.setItem(LANGUAGE_LOCALSTORAGE_KEY, item);
        }
        dynamicActivate(item);
      }}
    >
      <div className="menu-item-group"></div>
    </div>
  );
}
