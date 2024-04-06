import { useCallback, useEffect, useRef, useState } from "react";
import { TV_CHART_RELOAD_TIMESTAMP_KEY, TV_SAVE_LOAD_CHARTS_KEY } from "config/localStorage";
import { useLocalStorage, useMedia } from "react-use";
import { defaultChartProps, DEFAULT_PERIOD, disabledFeaturesOnMobile } from "./constants";
import useTVDatafeed from "domain/tradingview/useTVDatafeed";
import { ChartData, IChartingLibraryWidget, IPositionLineAdapter } from "../../charting_library";
import { getObjectKeyFromValue } from "domain/tradingview/utils";
import { SaveLoadAdapter } from "./SaveLoadAdapter";
import { SUPPORTED_RESOLUTIONS, TV_CHART_RELOAD_INTERVAL } from "config/tradingview";
import { isChartAvailabeForToken } from "config/tokens";
import { TVDataProvider } from "domain/tradingview/TVDataProvider";
import Loader from "components/Common/Loader";
import { useLocalStorageSerializeKey } from "lib/localStorage";
import { CHART_PERIODS } from "lib/legacy";


type ChartLine = {
    price: number;
    title: string;
}

type Props = {
    symbol: string;
    chainId: number;
    savedShouldShowPositionLines: boolean;
    chartLines: ChartLine[];
    onSelectToken: () => void;
    dataProvider?: TVDataProvider
}

export default function TVDataProvider ({
symbol,
chainId, 
savedShouldShowPositionLines,
chartLines, 
onSelectToken, 
dataProvider
}: Props){
    
}