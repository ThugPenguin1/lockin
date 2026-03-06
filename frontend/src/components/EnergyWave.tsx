"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { getEnergyCheckins } from "@/lib/storage";
import type { EnergyCheckin } from "@/lib/types";

interface Props {
  data?: EnergyCheckin[];
}

export default function EnergyWave({ data: externalData }: Props) {
  const [data, setData] = useState<{ label: string; level: number }[]>([]);

  useEffect(() => {
    const checkins = externalData ?? getEnergyCheckins();
    const recent = checkins.slice(-7).map((c) => ({
      label: new Date(c.timestamp).toLocaleDateString("en-US", {
        weekday: "short",
      }),
      level: c.level,
    }));
    setData(recent);
  }, [externalData]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
        Check in to see your energy trend
      </div>
    );
  }

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[1, 5]}
            tick={{ fontSize: 10, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={20}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#f8fafc",
              fontSize: "12px",
            }}
          />
          <Line
            type="monotone"
            dataKey="level"
            stroke="#38bdf8"
            strokeWidth={2}
            dot={{ fill: "#38bdf8", r: 3 }}
            activeDot={{ r: 5, fill: "#0ea5e9" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
