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

export interface ScoreLineData {
  label: string;
  score: number;
}

interface ScoreLineProps {
  data?: ScoreLineData[];
}

export function ScoreLine({ data = [] }: ScoreLineProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-full w-full" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Complete an interview to see your performance.
        </p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
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