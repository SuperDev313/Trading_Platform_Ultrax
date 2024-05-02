import { LANGUAGE_LOCALSTORAGE_KEY } from "config/localStorage";
import { dynamicActivate, isTestLanguage } from "lib/i18n";

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
      <div className="menu-item-group">
        <div className="menu-item-icon">
          {isTestLanguage(item) ? "🫐" : <img className="network-dropdown-icon" src={image} alt={locales[item]} />}
        </div>
        <span className="network-dropdown-item-label menu-item-label">{locales[item]}</span>
      </div>
      <div className="network-dropdown-menu-item-img">
        {currentLanguage.current === item && <img src={checkedIcon} alt={locales[item]} />}
      </div>
    </div>
  );
}
