"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Target, Brain, Sprout, Zap, ArrowRight } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5 },
  }),
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-500/5 via-transparent to-transparent" />
        <div className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-2 mb-8"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
              <Zap className="h-5 w-5 text-sky-400" />
            </div>
            <span className="text-xl font-semibold text-slate-50">Circadian</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-4xl md:text-6xl font-bold text-slate-50 leading-tight mb-6"
          >
            Stop managing time.
            <br />
            <span className="text-sky-400">Start managing energy.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10"
          >
            Circadian reads your energy and tells you the ONE thing to do right
            now. No overwhelm. Just flow.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <Link href="/dashboard">
              <Button size="lg" className="text-base gap-2 px-8">
                Get Started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Target,
              title: "One Task, Not Ten",
              desc: "Your energy determines your best next move. One clear recommendation, not a wall of todos.",
              i: 0,
            },
            {
              icon: Brain,
              title: "Study Smarter, Not Longer",
              desc: "Devil's Advocate AI challenges your notes so you truly understand — not just memorize.",
              i: 1,
            },
            {
              icon: Sprout,
              title: "Grow Your Mind Garden",
              desc: "Every task, study session, and wellness action grows a living garden. Progress you can see.",
              i: 2,
            },
          ].map((f) => (
            <motion.div
              key={f.title}
              custom={f.i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUp}
            >
              <Card className="h-full bg-slate-800/30 border-slate-700/50 hover:border-sky-500/30 transition-colors">
                <CardContent className="p-6">
                  <f.icon className="h-8 w-8 text-sky-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-50 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          custom={0}
          className="text-2xl md:text-3xl font-bold text-center text-slate-50 mb-12"
        >
          How It Works
        </motion.h2>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: "1", title: "Check your energy", desc: "5 seconds. Slide or play a reflex game.", emoji: "⚡" },
            { step: "2", title: "Get your ONE thing", desc: "AI-powered recommendation matched to your state.", emoji: "🎯" },
            { step: "3", title: "Focus, finish, grow", desc: "Adaptive timer. Complete tasks. Watch your garden bloom.", emoji: "🌱" },
          ].map((s, i) => (
            <motion.div
              key={s.step}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={fadeUp}
              className="text-center"
            >
              <div className="w-14 h-14 rounded-full bg-sky-500/20 flex items-center justify-center mx-auto mb-4 text-2xl">
                {s.emoji}
              </div>
              <p className="text-xs text-sky-400 font-medium mb-1">Step {s.step}</p>
              <h3 className="text-lg font-semibold text-slate-50 mb-2">{s.title}</h3>
              <p className="text-sm text-slate-400">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-12">
        <div className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-sky-400" />
            <span className="text-sm font-medium text-slate-400">Circadian</span>
          </div>
          <p className="text-xs text-slate-600">Energy-based productivity</p>
        </div>
      </footer>
    </div>
  );
}
