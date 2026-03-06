"use client";

import { Suspense, useEffect, useState } from "react";
import FocusTimer from "@/components/FocusTimer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getFocusSessions } from "@/lib/storage";
import type { FocusSession } from "@/lib/types";
import { History } from "lucide-react";

function FocusContent() {
  const [sessions, setSessions] = useState<FocusSession[]>([]);

  useEffect(() => {
    setSessions(getFocusSessions().slice(-5).reverse());
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-50">Focus Timer</h1>

      <FocusTimer />

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
                  <div>
                    <p className="text-sm text-slate-50">{s.taskTitle}</p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(s.startedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary">{s.durationMinutes}min</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function FocusPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-slate-500">
          Loading...
        </div>
      }
    >
      <FocusContent />
    </Suspense>
  );
}
