"use client";

import * as React from "react";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

interface RadialChartProps extends React.ComponentProps<"div"> {
    /**
     * Fill colour for the progress bar, e.g. '#22c55e'. Defaults to brand blue.
     */
    readonly color?: string;
    /**
     * Overall width / height of the circular chart. Defaults to 50 px.
     */
    readonly size?: number;
    /**
     * Percentage value from 0-100 that the chart should display.
     */
    readonly value: number;
}

const RadialChartImpl = ({
    value,
    size = 50,
    color = "#2563eb",
    ...props
}: RadialChartProps) => {
    const normalizedValue = React.useMemo(() => {
        if (Number.isNaN(value) || value < 0) {
            return 0;
        }
        if (value > 100) {
            return 100;
        }
        return value;
    }, [value]);

    const data = [{ name: "progress", value: normalizedValue }];
    const innerRadius = size * 0.24;
    const outerRadius = size * 0.36;
    const barSize = size * 0.08;

    return (
        <div
            aria-hidden
            style={{ height: size, position: "relative", width: size }}
            {...props}
        >
            <RadialBarChart
                barSize={barSize}
                cx={size / 2}
                cy={size / 2}
                data={data}
                endAngle={-270}
                height={size}
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                startAngle={90}
                width={size}
            >
                <PolarAngleAxis
                    angleAxisId={0}
                    domain={[0, 100]}
                    tick={false}
                    type="number"
                />
                <RadialBar
                    background
                    cornerRadius={size / 2}
                    dataKey="value"
                    fill={color}
                />
            </RadialBarChart>
        </div>
    );
};

const RadialChart = React.memo(RadialChartImpl);
RadialChart.displayName = "RadialChart";

export { RadialChart };
