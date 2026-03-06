"use client";

import { useEffect, useState } from "react";
import DevilsAdvocate from "@/components/DevilsAdvocate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStudySessions } from "@/lib/storage";
import type { StudySession } from "@/lib/types";
import { History } from "lucide-react";

export default function StudyPage() {
  const [sessions, setSessions] = useState<StudySession[]>([]);

  useEffect(() => {
    setSessions(getStudySessions().slice(-5).reverse());
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-50">Study Mode</h1>

      <DevilsAdvocate />

      {sessions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-400">
              <History className="h-4 w-4" /> Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-50 truncate">
                      {s.topic || "Untitled"}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    className={
                      s.scores.overall >= 70
                        ? "bg-emerald-500/20 text-emerald-400"
                        : s.scores.overall >= 40
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-red-500/20 text-red-400"
                    }
                  >
                    {s.scores.overall}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
