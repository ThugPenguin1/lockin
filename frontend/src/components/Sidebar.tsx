"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getProfile } from "@/lib/storage";
import { getGardenLevel } from "@/lib/xp";
import { ENERGY_LEVEL_LABELS } from "@/lib/constants";
import {
  Home,
  ListTodo,
  BarChart2,
  Brain,
  Timer,
  Flower2,
  Menu,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/dashboard/tasks", label: "Tasks", icon: ListTodo },
  { href: "/dashboard/study", label: "Study", icon: Brain },
  { href: "/dashboard/focus", label: "Focus Timer", icon: Timer },
  { href: "/dashboard/garden", label: "Garden", icon: Flower2 },
  { href: "/dashboard/insights", label: "Insights", icon: BarChart2 },
];

function SidebarContent() {
  const pathname = usePathname();
  const [profile, setProfile] = useState({ name: "", xp: 0, streakCount: 0, currentEnergy: 3 });
  const [gardenInfo, setGardenInfo] = useState<ReturnType<typeof getGardenLevel> | null>(null);

  useEffect(() => {
    const p = getProfile();
    setProfile(p);
    setGardenInfo(getGardenLevel(p.xp));
  }, [pathname]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center">
            <Zap className="h-4 w-4 text-sky-400" />
          </div>
          <span className="font-semibold text-slate-50">Circadian</span>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-sky-500/20 text-sky-400"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-50"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-sky-500/20 flex items-center justify-center text-xs font-medium text-sky-400">
            {profile.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-50 truncate">{profile.name || "User"}</p>
            <p className="text-[10px] text-slate-500">
              {ENERGY_LEVEL_LABELS[profile.currentEnergy]} Energy
            </p>
          </div>
        </div>

        {gardenInfo && (
          <div>
            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
              <span>Lv.{gardenInfo.level} {gardenInfo.name}</span>
              <span>{gardenInfo.currentXP} XP</span>
            </div>
            <Progress value={gardenInfo.progress} className="h-1.5" />
          </div>
        )}

        {profile.streakCount > 0 && (
          <p className="text-xs text-amber-400">
            🔥 {profile.streakCount} day streak
          </p>
        )}
      </div>
    </div>
  );
}

export default function Sidebar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-slate-700 bg-slate-900 fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile hamburger */}
      <div className="md:hidden fixed top-4 left-4 z-40">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" variant="ghost" className="bg-slate-800/80 backdrop-blur">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">App navigation menu</SheetDescription>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
