"use client";

import { quotes } from "@/lib/quotes";
import { Card, CardContent } from "@/components/ui/card";
import { getSimulatedNow } from "@/lib/storage";

function getDayOfYear(): number {
  const now = getSimulatedNow();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default function QuoteCard() {
  const quote = quotes[getDayOfYear() % quotes.length];

  return (
    <Card className="bg-slate-800/30 border-slate-700/50">
      <CardContent className="p-6">
        <p className="text-slate-300 italic text-sm leading-relaxed">
          &ldquo;{quote.text}&rdquo;
        </p>
        <p className="text-slate-500 text-xs mt-2">— {quote.author}</p>
      </CardContent>
    </Card>
  );
}
