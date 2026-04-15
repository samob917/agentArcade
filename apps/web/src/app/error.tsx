"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="bg-grid min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center">
        <div className="text-4xl mb-4">&#x26A0;&#xFE0F;</div>
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-zinc-500 text-sm mb-6 max-w-sm mx-auto">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="rounded-xl bg-gradient-to-r from-cyan-glow to-cyan-glow/80 px-6 py-3 text-sm font-semibold text-black hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
