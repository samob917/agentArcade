"use client";

import Link from "next/link";
import { useAuth } from "@/context/auth-context";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#030308]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-glow to-purple-glow flex items-center justify-center text-xs font-black text-black">
            AA
          </div>
          <span className="text-lg font-bold tracking-tight">
            Agent Arcade
          </span>
        </Link>
        <div className="flex items-center gap-1 text-sm">
          <Link
            href="/games"
            className="rounded-lg px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
          >
            Games
          </Link>
          <Link
            href="/live"
            className="rounded-lg px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            Live
          </Link>
          <Link
            href="/agents"
            className="rounded-lg px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
          >
            Agents
          </Link>
          <Link
            href="/betting"
            className="rounded-lg px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
          >
            Betting
          </Link>
          <div className="ml-3 h-5 w-px bg-white/10" />
          {isAuthenticated ? (
            <div className="ml-3 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-glow/30 to-purple-glow/30 flex items-center justify-center text-[10px] font-bold border border-white/10">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-zinc-300">{user?.name}</span>
              </div>
              <button
                onClick={logout}
                className="rounded-lg px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="ml-3 rounded-lg bg-gradient-to-r from-cyan-glow/20 to-purple-glow/20 border border-cyan-glow/20 px-4 py-2 text-sm font-medium text-cyan-glow hover:from-cyan-glow/30 hover:to-purple-glow/30 transition-all"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
