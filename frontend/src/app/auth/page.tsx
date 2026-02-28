"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, User, Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { authAPI } from "@/lib/api";
import { toast } from "sonner";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") || "login";

  const [mode, setMode] = useState<"login" | "register">(initialMode as "login" | "register");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    username: "",
    display_name: "",
    password: "",
  });
  const { setAuth } = useAppStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "register") {
        const res = await authAPI.register(form);
        setAuth(res.access_token, res.user);
        toast.success("Welcome to LockIn!");
        router.push("/onboarding");
      } else {
        const res = await authAPI.login({ email: form.email, password: form.password });
        setAuth(res.access_token, res.user);
        toast.success("Welcome back!");
        router.push("/lobby");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-lockin-bg flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-lockin-text-muted hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="glass rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                {mode === "register" ? "Create Account" : "Welcome Back"}
              </h1>
              <p className="text-sm text-lockin-text-muted">
                {mode === "register" ? "Join your squad and start locking in" : "Your squad is waiting"}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-lockin-text-muted mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lockin-text-muted" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-lockin-bg border border-lockin-border rounded-xl text-lockin-text placeholder-lockin-text-muted/50 focus-ring transition-colors"
                  placeholder="you@university.edu"
                  required
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {mode === "register" && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div>
                    <label className="block text-sm font-medium text-lockin-text-muted mb-1.5">Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lockin-text-muted text-sm">@</span>
                      <input
                        type="text"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        className="w-full pl-8 pr-4 py-3 bg-lockin-bg border border-lockin-border rounded-xl text-lockin-text placeholder-lockin-text-muted/50 focus-ring"
                        placeholder="studyking"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-lockin-text-muted mb-1.5">Display Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lockin-text-muted" />
                      <input
                        type="text"
                        value={form.display_name}
                        onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-lockin-bg border border-lockin-border rounded-xl text-lockin-text placeholder-lockin-text-muted/50 focus-ring"
                        placeholder="Amy Chen"
                        required
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-sm font-medium text-lockin-text-muted mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lockin-text-muted" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 bg-lockin-bg border border-lockin-border rounded-xl text-lockin-text placeholder-lockin-text-muted/50 focus-ring"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-lockin-text-muted hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 gradient-primary rounded-xl text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : mode === "register" ? (
                "Create Account"
              ) : (
                "Log In"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-lockin-text-muted">
              {mode === "register" ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => setMode(mode === "register" ? "login" : "register")}
                className="text-lockin-primary-light hover:text-lockin-primary font-medium transition-colors"
              >
                {mode === "register" ? "Log in" : "Sign up"}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-lockin-bg flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-lockin-primary" /></div>}>
      <AuthForm />
    </Suspense>
  );
}
