import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-grid min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center">
        <div className="text-6xl font-bold font-mono text-gradient mb-4">404</div>
        <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
        <p className="text-zinc-500 text-sm mb-8 max-w-sm mx-auto">
          This page doesn&apos;t exist. Maybe the match ended, or you took a wrong turn.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-gradient-to-r from-cyan-glow to-cyan-glow/80 px-6 py-3 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
          >
            Go Home
          </Link>
          <Link
            href="/games"
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold hover:bg-white/10 transition-all"
          >
            Browse Games
          </Link>
        </div>
      </div>
    </div>
  );
}
