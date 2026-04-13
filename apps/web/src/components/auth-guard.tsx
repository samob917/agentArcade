"use client";

import { useAuth } from "@/context/auth-context";
import Link from "next/link";

/**
 * Wraps content that requires authentication.
 * Shows a login prompt if not authenticated.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-zinc-600 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center max-w-md">
          <div className="text-3xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2">Login Required</h2>
          <p className="text-zinc-500 text-sm mb-6">
            You need to sign in to play games. Watching is free!
          </p>
          <Link
            href="/login"
            className="rounded-xl bg-gradient-to-r from-cyan-glow to-cyan-glow/80 px-8 py-3 text-sm font-semibold text-black hover:opacity-90 transition-opacity inline-block"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
