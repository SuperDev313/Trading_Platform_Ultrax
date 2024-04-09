import { ARBITRUM, FTM_TESTNET, U2U_TESTNET } from "config/chains";
import { formatTVDate, formatTVTime } from "lib/dates";

const RED = "#ff5353";
const GREEN = "#0ecc83";
export const DEFAULT_PERIOD = "4h"

const chartStyleOverrides = ["candleStyle", "hollowCandleStyle", "haStyle"].reduce((acc, cv) => {
    acc[`mainSeriesProperties.${cv}.drawWick`] = true;
    acc[`mainSeriesProperties.${cv}.drawBorder`] = false;
    acc[`mainSeriesProperties.${cv}.upColor`] = GREEN;
    acc[`mainSeriesProperties.${cv}.downColor`] = RED;
    acc[`mainSeriesProperties.${cv}.wickUpColor`] = GREEN;
    acc[`mainSeriesProperties.${cv}.wickDownColor`] = RED;
    acc[`mainSeriesProperties.${cv}.borderUpColor`] = GREEN;
    acc[`mainSeriesProperties.${cv}.borderDownColor`] = RED;
    return acc;
  }, {});

  const chartOverrides = {
    "paneProperties.background": "#151E2C",
    "paneProperties.backgroundGradientStartColor": "#151E2C",
    "paneProperties.backgroundGradientEndColor": "#151E2C",
    "paneProperties.backgroundType": "solid",
    "paneProperties.vertGridProperties.color": "rgba(35, 38, 59, 1)",
    "paneProperties.vertGridProperties.style": 2,
    "paneProperties.horzGridProperties.color": "rgba(35, 38, 59, 1)",
    "paneProperties.horzGridProperties.style": 2,
    "mainSeriesProperties.priceLineColor": "#3a3e5e",
    "scalesProperties.textColor": "#fff",
    "scalesProperties.lineColor": "#151E2C",
    ...chartStyleOverrides,
  };

  const disabledFeatures = [
    "volume_force_overlay",
    "show_logo_on_all_charts",
    "caption_buttons_text_if_possible",
    "create_volume_indicator_by_default",
    "header_compare",
    "compare_symbol",
    "display_market_status",
    "header_interval_dialog_button",
    "show_interval_dialog_on_key_press",
    "header_symbol_search",
    "popup_hints",
    "header_in_fullscreen_mode",
    "use_localstorage_for_settings",
    "right_bar_stays_on_scroll",
    "symbol_info",
  ];
  
  export const disableFeaturesOnMobile = ["header_saveload", "header_fullscreen_button"];

