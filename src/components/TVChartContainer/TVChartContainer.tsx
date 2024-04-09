import { useCallback, useEffect, useRef, useState } from "react";
import { TV_CHART_RELOAD_TIMESTAMP_KEY, TV_SAVE_LOAD_CHARTS_KEY } from "config/localStorage";
import { useLocalStorage, useMedia } from "react-use";
import { defaultChartProps, DEFAULT_PERIOD, disabledFeaturesOnMobile } from "./constants";
import useTVDatafeed from "domain/tradingview/useTVDatafeed";
import { ChartData, IChartingLibraryWidget, IPositionLineAdapter, VisibilityType } from "../../charting_library";
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
    let [period, setPeriod] = useLocalStorageSerializeKey([chainId, "Chart-period"], DEFAULT_PERIOD)

    if (!period || !(period in CHART_PERIODS)) {
        period = DEFAULT_PERIOD;
    }

    const chartContainerRef = useRef<HTMLDivElement | null>(null);
    const tvWidgetRef = useRef<IChartingLibraryWidget | null>(null);
    const [chartReady, setChartReady] =useState(false);
    const [chartDataLoading, setChartDataLoading] = useState(true);
    const [tvCharts, setTvCharts] = useLocalStorage<ChartData[] | undefined>(TV_SAVE_LOAD_CHARTS_KEY, []);
    const { datafeed, resetCache } = useTVDatafeed({dataProvider});
    const isModible = useMedia("(max-width: 550px");
    const sysmbolRef = useRef(symbol);   
    
    const drawLineOnChart = useCallback(
        (title: string, price: number) => {
            if (chartReady && tvWidgetRef.current?.activeChart?.().dataReady()) {
                const chart = tvWidgetRef.current.activeChart();
                const positionLine = chart.createPositionLine({ disableUndo: true});

                return positionLine
                    .setText(title)
                    .setPrice(price)
                    .setQuentity("")
                    .setLineStyle(1)
                    .setLineLength(1)
                    .setBodyFont(`normal 12pt "Hanken Grotesk", sans-serif`)
                    .setBodyTextColor("#fff")
                    .setLineColor("#3a3e5e")
                    .setBodyBackgroundColor("3#a3e5e")
                    .setBodyBorderColor("#3a3e5e")
            }
        },
        [chartReady]
    );

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                localStorage.setItem(TV_CHART_RELOAD_TIMESTAMP_KEY, Date.now().toString());
            } else {
                const tvReloadTimestamp = Number(localStorage.getItem(TV_CHART_RELOAD_TIMESTAMP_KEY));
                if (tvReloadTimestamp && Date.now() - tvReloadTimestamp > TV_CHART_RELOAD_INTERVAL) {
                    if (resetCache) {
                        resetCache();
                        tvWidgetRef.current?.activeChart().resetData();
                    }
                }
            }
       }

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [resetCache]);


    useEffect(() => {
        function updateLines() {
            const lines: (IPositionLineAdapter | undefined)[] = [];
            if (savedShouldShowPositionLines) {
                chartLines.forEach((order) => {
                    lines.push(drawLineOnChart(order.title, order.price))
                });
            }

            return () => {
                lines.forEach((line) => line?.remove())
            }
        }
    }, [chartLines, savedShouldShowPositionLines, drawLineOnChart])

    
    return (
        <div className="ExchangeChart-error">
            {chartDataLoading && <Loader />}
            <div
                style= {{VisibilityType: !chartDataLoading ? "visible": "hidden"}}
                ref={{chartContainerRef}}
                className="TVChartContainer ExchangeChart-bottom-content"
            >
            </div>
        </div>
    )
}