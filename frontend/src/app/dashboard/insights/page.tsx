"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getEnergyCheckins } from "@/lib/storage";
import { getEnergyPatterns, type EnergyPatterns } from "@/lib/energyAnalysis";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { TrendingUp, TrendingDown, Moon, Activity, Clock, Zap } from "lucide-react";

const ACTIVITY_LABELS: Record<string, string> = {
  just_woke_up: "Just woke up",
  been_working: "Been working",
  ate_meal: "After eating",
  exercised: "After exercise",
  been_on_phone: "After phone",
  just_relaxed: "After relaxing",
  other: "Other",
};

const SLEEP_LABELS: Record<string, string> = {
  bad: "Badly",
  okay: "Okay",
  well: "Well",
  great: "Great",
};

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

export default function InsightsPage() {
  const [patterns, setPatterns] = useState<EnergyPatterns | null>(null);

  useEffect(() => {
    const checkins = getEnergyCheckins();
    if (checkins.length > 0) {
      setPatterns(getEnergyPatterns(checkins));
    }
  }, []);

  if (!patterns || patterns.totalCheckins < 5) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-50">Energy Insights</h1>
        <Card>
          <CardContent className="p-12 text-center">
            <Zap className="h-10 w-10 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">Keep checking in to unlock your personal energy insights.</p>
            <p className="text-xs text-slate-500">
              {patterns ? patterns.totalCheckins : 0}/5 check-ins recorded. We need a few more data points to find your patterns.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hourData = Object.entries(patterns.averageEnergyByHour)
    .map(([h, avg]) => ({ hour: Number(h), avg: Math.round(avg * 10) / 10, label: formatHour(Number(h)) }))
    .sort((a, b) => a.hour - b.hour);

  const activityData = Object.entries(patterns.postActivityEffect)
    .map(([act, avg]) => ({
      activity: ACTIVITY_LABELS[act] || act,
      avg: Math.round(avg * 10) / 10,
    }))
    .sort((a, b) => b.avg - a.avg);

  const sleepData = Object.entries(patterns.sleepImpact)
    .map(([q, avg]) => ({
      quality: SLEEP_LABELS[q] || q,
      avg: Math.round(avg * 10) / 10,
      key: q,
    }))
    .sort((a, b) => {
      const order = ["bad", "okay", "well", "great"];
      return order.indexOf(a.key) - order.indexOf(b.key);
    });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-50">Energy Insights</h1>
      <p className="text-sm text-slate-400 -mt-4">
        Based on {patterns.totalCheckins} check-ins. Your personal circadian rhythm.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-400">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> Your Peak Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {patterns.peakHours.map((h) => (
                <Badge key={h} className="bg-emerald-500/20 text-emerald-400 text-sm px-3 py-1">
                  {formatHour(h)}
                  <span className="ml-1 text-[10px] opacity-70">
                    ({patterns.averageEnergyByHour[h]?.toFixed(1)}/5)
                  </span>
                </Badge>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Schedule deep focus and creative work during these hours.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-400">
              <TrendingDown className="h-4 w-4 text-amber-400" /> Your Dip Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {patterns.dipHours.map((h) => (
                <Badge key={h} className="bg-amber-500/20 text-amber-400 text-sm px-3 py-1">
                  {formatHour(h)}
                  <span className="ml-1 text-[10px] opacity-70">
                    ({patterns.averageEnergyByHour[h]?.toFixed(1)}/5)
                  </span>
                </Badge>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-2">
              Save light and routine tasks for these low-energy windows.
            </p>
          </CardContent>
        </Card>
      </div>

      {hourData.length > 3 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-400">
              <Clock className="h-4 w-4" /> Your Circadian Rhythm
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourData}>
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} width={20} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f8fafc", fontSize: "12px" }}
                    formatter={(value: number) => [`${value}/5`, "Avg Energy"]}
                  />
                  <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                    {hourData.map((entry) => (
                      <Cell
                        key={entry.hour}
                        fill={
                          patterns.peakHours.includes(entry.hour)
                            ? "#10b981"
                            : patterns.dipHours.includes(entry.hour)
                            ? "#f59e0b"
                            : "#38bdf8"
                        }
                        fillOpacity={0.7}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {activityData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-400">
              <Activity className="h-4 w-4" /> Activity Impact on Energy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activityData.map((item) => (
                <div key={item.activity} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-28 flex-shrink-0">{item.activity}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sky-500 transition-all"
                      style={{ width: `${(item.avg / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-300 font-medium w-8 text-right">{item.avg}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {sleepData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-400">
              <Moon className="h-4 w-4" /> Sleep Quality &rarr; Daily Energy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 justify-around">
              {sleepData.map((item) => (
                <div key={item.key} className="flex flex-col items-center gap-1">
                  <span className="text-lg font-bold text-slate-50">{item.avg}</span>
                  <div
                    className="w-12 rounded-t bg-violet-500/60"
                    style={{ height: `${(item.avg / 5) * 80}px` }}
                  />
                  <span className="text-[10px] text-slate-500">{item.quality}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-3 text-center">
              Average energy level across the day based on sleep quality
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-400">Current Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge
              className={
                patterns.currentTrend === "rising"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : patterns.currentTrend === "falling"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-slate-700 text-slate-400"
              }
            >
              {patterns.currentTrend === "rising"
                ? "↑ Energy Rising"
                : patterns.currentTrend === "falling"
                ? "↓ Energy Falling"
                : "→ Stable"}
            </Badge>
            {patterns.todaySleep && (
              <span className="text-xs text-slate-500">
                Slept {patterns.todaySleep} last night
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
