
import { useEffect, useState } from "react";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { progress } from "../../lib/mock-data";

export function ScoreLine() {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-full w-full" />;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={progress}
        margin={{
          top: 8,
          right: 8,
          left: -24,
          bottom: 0,
        }}
      >
        <CartesianGrid
          stroke="var(--color-border)"
          vertical={false}
        />

        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{
            fill: "var(--color-muted-foreground)",
            fontSize: 11,
          }}
        />

        <YAxis
          domain={[40, 100]}
          axisLine={false}
          tickLine={false}
          tick={{
            fill: "var(--color-muted-foreground)",
            fontSize: 11,
          }}
        />

        <Tooltip
          cursor={{
            stroke: "var(--color-border)",
          }}
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />

        <Line
          type="monotone"
          dataKey="score"
          stroke="var(--color-forest)"
          strokeWidth={2}
          dot={{
            r: 3,
            fill: "var(--color-forest)",
            strokeWidth: 0,
          }}
          activeDot={{
            r: 5,
            fill: "var(--color-terracotta)",
            strokeWidth: 0,
          }}
          animationDuration={900}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default ScoreLine;