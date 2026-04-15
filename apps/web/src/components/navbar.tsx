"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-context";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#030308]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
        <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-glow to-purple-glow flex items-center justify-center text-xs font-black text-black">
            AA
          </div>
          <span className="text-lg font-bold tracking-tight">
            Agent Arcade
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1 text-sm">
          <NavLinks />
          <div className="ml-3 h-5 w-px bg-white/10" />
          <AuthSection user={user} isAuthenticated={isAuthenticated} logout={logout} />
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden rounded-lg p-2 text-zinc-400 hover:bg-white/5 transition-all"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-[#030308]/95 backdrop-blur-xl px-4 py-4 space-y-1">
          <MobileNavLinks onNavigate={() => setMobileOpen(false)} />
          <div className="pt-3 mt-3 border-t border-white/5">
            <AuthSection user={user} isAuthenticated={isAuthenticated} logout={logout} mobile onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </nav>
  );
}

function NavLinks() {
  return (
    <>
      <Link href="/games" className="rounded-lg px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
        Games
      </Link>
      <Link href="/live" className="rounded-lg px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        Live
      </Link>
      <Link href="/agents" className="rounded-lg px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
        Agents
      </Link>
      <Link href="/betting" className="rounded-lg px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
        Betting
      </Link>
    </>
  );
}

function MobileNavLinks({ onNavigate }: { onNavigate: () => void }) {
  const links = [
    { href: "/games", label: "Games" },
    { href: "/live", label: "Live", live: true },
    { href: "/agents", label: "Agents" },
    { href: "/betting", label: "Betting" },
  ];

  return (
    <>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
        >
          {link.live && (
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
          )}
          {link.label}
        </Link>
      ))}
    </>
  );
}

function AuthSection({
  user,
  isAuthenticated,
  logout,
  mobile,
  onNavigate,
}: {
  user: { name: string } | null;
  isAuthenticated: boolean;
  logout: () => void;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  if (isAuthenticated) {
    return (
      <div className={`flex items-center ${mobile ? "justify-between" : "gap-3 ml-3"}`}>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-glow/30 to-purple-glow/30 flex items-center justify-center text-[10px] font-bold border border-white/10">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-zinc-300">{user?.name}</span>
        </div>
        <button
          onClick={() => { logout(); onNavigate?.(); }}
          className="rounded-lg px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      onClick={onNavigate}
      className={`rounded-lg bg-gradient-to-r from-cyan-glow/20 to-purple-glow/20 border border-cyan-glow/20 px-4 py-2 text-sm font-medium text-cyan-glow hover:from-cyan-glow/30 hover:to-purple-glow/30 transition-all ${mobile ? "block text-center" : "ml-3"}`}
    >
      Sign In
    </Link>
  );
}
