"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import { Lock, Users, Brain, Zap, ChevronRight } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { token } = useAppStore();

  useEffect(() => {
    if (token) {
      router.push("/lobby");
    }
  }, [token, router]);

  return (
    <div className="min-h-screen bg-lockin-bg overflow-hidden">
      <nav className="fixed top-0 w-full z-50 glass">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold">LockIn</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/auth?mode=login")}
              className="px-4 py-2 text-sm text-lockin-text-muted hover:text-white transition-colors"
            >
              Log in
            </button>
            <button
              onClick={() => router.push("/auth?mode=register")}
              className="px-4 py-2 text-sm gradient-primary rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-sm text-lockin-primary-light mb-8">
              <Zap className="w-3.5 h-3.5" />
              Powered by on-device AI
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-tight mb-6">
              Your friends are <br />
              <span className="text-gradient">locked in.</span>
              <br />
              Are you?
            </h1>
            <p className="text-lg md:text-xl text-lockin-text-muted max-w-2xl mx-auto mb-10">
              The social study platform that uses AI-powered attention tracking
              and friend group accountability to turn procrastination into productivity.
              No video calls. No strangers. Just your squad.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push("/auth?mode=register")}
                className="px-8 py-4 gradient-primary rounded-xl text-white font-semibold text-lg hover:opacity-90 transition-all animate-glow flex items-center justify-center gap-2"
              >
                Start Locking In
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-8 py-4 glass rounded-xl text-lockin-text font-medium text-lg hover:bg-lockin-card transition-colors"
              >
                See How It Works
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 glass rounded-2xl p-8 max-w-3xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-lockin-text-muted text-sm ml-2">LockIn Session — Study Squad</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { name: "Amy", time: "1h 10m", score: 92, status: "On fire" },
                { name: "Kevin", time: "1h 35m", score: 88, status: "Focused" },
                { name: "You", time: "0h 23m", score: 82, status: "Focused" },
              ].map((p) => (
                <div key={p.name} className="bg-lockin-bg rounded-xl p-4 text-center">
                  <div className="w-10 h-10 rounded-full gradient-success mx-auto mb-2 flex items-center justify-center text-sm font-bold">
                    {p.name[0]}
                  </div>
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-lockin-text-muted text-xs">{p.time}</div>
                  <div className="text-lockin-secondary text-xs font-medium mt-1">{p.status}</div>
                </div>
              ))}
            </div>
            <div className="bg-lockin-bg rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-lockin-text-muted">Your focus</span>
                <span className="text-sm font-mono font-bold text-lockin-secondary">82%</span>
              </div>
              <div className="w-full bg-lockin-border rounded-full h-3">
                <div className="gradient-success h-3 rounded-full transition-all" style={{ width: "82%" }} />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Why LockIn <span className="text-gradient">works</span>
          </h2>
          <p className="text-lockin-text-muted text-center mb-16 max-w-2xl mx-auto">
            We don&apos;t fight procrastination with willpower. We fight it with the most powerful force in human psychology: not wanting to let your friends down.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Squad Accountability",
                desc: "See your friends studying in real-time. One tap to join. No coordination friction, no excuses.",
                color: "from-lockin-primary to-lockin-primary-light",
              },
              {
                icon: Brain,
                title: "AI Attention Tracking",
                desc: "On-device computer vision detects when you drift. Smart nudges pull you back — powered by your friend group's status.",
                color: "from-lockin-secondary to-emerald-400",
              },
              {
                icon: Zap,
                title: "Smart Insights",
                desc: "ML analyzes your patterns to find your optimal study partners, times, and group sizes. Data-driven productivity.",
                color: "from-lockin-accent to-orange-400",
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                viewport={{ once: true }}
                className="glass rounded-2xl p-8 hover:border-lockin-primary/30 transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
                <p className="text-lockin-text-muted leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-lockin-card/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Privacy is <span className="text-gradient">non-negotiable</span>
          </h2>
          <p className="text-lockin-text-muted max-w-2xl mx-auto mb-12">
            Your camera feed never leaves your device. Our AI runs entirely in your browser using edge computing.
            No video is transmitted, stored, or seen by anyone — ever.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { stat: "0 bytes", label: "of video uploaded" },
              { stat: "100%", label: "on-device processing" },
              { stat: "Zero", label: "server-side camera access" },
            ].map((s) => (
              <div key={s.label} className="glass rounded-xl p-6">
                <div className="text-3xl font-black text-gradient mb-2">{s.stat}</div>
                <div className="text-sm text-lockin-text-muted">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to lock in?</h2>
          <button
            onClick={() => router.push("/auth?mode=register")}
            className="px-10 py-4 gradient-primary rounded-xl text-white font-semibold text-lg hover:opacity-90 transition-all animate-glow"
          >
            Create Your Squad
          </button>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-lockin-border">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 gradient-primary rounded flex items-center justify-center">
              <Lock className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold">LockIn</span>
          </div>
          <p className="text-sm text-lockin-text-muted">
            Built for Hack The East 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
