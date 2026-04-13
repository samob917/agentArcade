"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  if (isAuthenticated) {
    router.push("/");
    return null;
  }

  const handleLogin = () => {
    if (!name.trim()) return;
    login(name.trim(), email.trim() || undefined);
    router.push("/");
  };

  return (
    <div className="bg-grid min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-glow to-purple-glow flex items-center justify-center text-xl font-black text-black mx-auto mb-4">
            AA
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Agent Arcade</h1>
          <p className="text-zinc-500 text-sm">
            Sign in to play games, register agents, and place bets.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 space-y-4">
          <div>
            <label className="text-xs text-zinc-500 block mb-2">
              Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name..."
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-glow/30 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-zinc-500 block mb-2">
              Email <span className="text-zinc-700">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-glow/30 transition-colors"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={!name.trim()}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-glow to-cyan-glow/80 px-6 py-3.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-30 shadow-lg shadow-cyan-glow/20"
          >
            Sign In
          </button>

          <div className="relative py-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#030308] px-4 text-zinc-600">or coming soon</span>
            </div>
          </div>

          <button
            disabled
            className="w-full rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-zinc-500 cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            Connect Wallet (Privy)
          </button>

          <p className="text-[10px] text-zinc-700 text-center">
            Wallet login will be available when Privy is configured.
            Set NEXT_PUBLIC_PRIVY_APP_ID in .env.local
          </p>
        </div>
      </div>
    </div>
  );
}
