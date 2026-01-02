'use client';

import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';

/**
 * TradingView-style Candlestick Chart using lightweight-charts v5
 * Based on CoinGecko tutorial with v5 API updates
 */
export const CandleChart = ({ data, height = 400 }) => {
    const chartContainerRef = useRef(null);

    useEffect(() => {
        // Validate inputs
        if (!chartContainerRef.current) {
            console.log('[CandleChart] No container ref');
            return;
        }

        if (!data || !Array.isArray(data) || data.length === 0) {
            console.log('[CandleChart] No data provided');
            return;
        }

        // Transform data - handle both {timestamp} and {time} formats
        const candleData = [];
        for (const item of data) {
            let timeValue;

            // Determine time value from various formats
            if (typeof item.time === 'number') {
                // If time is in milliseconds (> year 2001 in ms), convert to seconds
                timeValue = item.time > 1000000000000 ? Math.floor(item.time / 1000) : Math.floor(item.time);
            } else if (typeof item.timestamp === 'number') {
                // Timestamp is typically in milliseconds
                timeValue = Math.floor(item.timestamp / 1000);
            } else {
                console.warn('[CandleChart] Invalid item, no time/timestamp:', item);
                continue;
            }

            // Validate OHLC values
            const open = Number(item.open);
            const high = Number(item.high);
            const low = Number(item.low);
            const close = Number(item.close);

            if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
                console.warn('[CandleChart] Invalid OHLC values:', item);
                continue;
            }

            candleData.push({ time: timeValue, open, high, low, close });
        }

        // Sort and dedupe
        candleData.sort((a, b) => a.time - b.time);
        const uniqueData = candleData.filter((item, index, self) =>
            index === 0 || item.time !== self[index - 1].time
        );

        console.log(`[CandleChart] Creating chart with ${uniqueData.length} candles`);

        if (uniqueData.length === 0) {
            console.error('[CandleChart] No valid data after processing');
            return;
        }

        // Log first and last candle for debugging
        console.log('[CandleChart] First candle:', uniqueData[0]);
        console.log('[CandleChart] Last candle:', uniqueData[uniqueData.length - 1]);

        // Create chart
        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: height,
            layout: {
                background: { type: ColorType.Solid, color: '#131722' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#2B2B43' },
                horzLines: { color: '#2B2B43' },
            },
            crosshair: {
                mode: 1,
            },
            rightPriceScale: {
                borderColor: '#2B2B43',
            },
            timeScale: {
                borderColor: '#2B2B43',
                timeVisible: true,
            },
        });

        // Add candlestick series using v5 API: chart.addSeries(CandlestickSeries, options)
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        // Set data
        candleSeries.setData(uniqueData);

        // Fit content
        chart.timeScale().fitContent();

        console.log('[CandleChart] Chart created successfully');

        // Handle resize
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, height]);

    return (
        <div
            ref={chartContainerRef}
            style={{
                width: '100%',
                height: `${height}px`,
                backgroundColor: '#131722',
                borderRadius: '8px',
            }}
        />
    );
};

export default CandleChart;
