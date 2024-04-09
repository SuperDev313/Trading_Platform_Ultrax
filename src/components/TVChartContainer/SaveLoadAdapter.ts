import { ChartData } from 'charting_library';
import { getTokenBySymbol } from 'config/tokens';
import { Token } from "domain/tokens";

export class SaveLoadAdapter {
    charts: ChartData[] | undefined;
    setTvCharts: (a: ChartData[]) => void;
    onSelectToken: (token: Token) => void;
    chainId: number;

    constructor(
        chainId: number,
        charts: ChartData[] | undefined,
        setTvCharts: (a: ChartData[]) => void,
        onSelectToken: (token: Token) => void
      ) {
        this.charts = charts;
        this.setTvCharts = setTvCharts;
        this.chainId = chainId;
        this.onSelectToken = onSelectToken;
      }
}