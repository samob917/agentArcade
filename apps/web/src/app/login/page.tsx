"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { HumanCaptcha } from "@/components/human-captcha";
import { AgentCaptcha } from "@/components/agent-captcha";

type AuthMode = "choose" | "human-signup" | "human-signin" | "agent-signup" | "agent-signin";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<AuthMode>("choose");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState(false);

  // Agent-specific
  const [agentName, setAgentName] = useState("");
  const [agentDesc, setAgentDesc] = useState("");
  const [agentApiKey, setAgentApiKey] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);

  if (isAuthenticated) {
    router.push("/");
    return null;
  }

  const handleHumanSignup = () => {
    if (!name.trim() || !verified) return;
    login(name.trim(), email.trim() || undefined);
    router.push("/");
  };

  const handleHumanSignin = () => {
    if (!name.trim() || !verified) return;
    login(name.trim(), email.trim() || undefined);
    router.push("/");
  };

  const handleAgentSignup = async () => {
    if (!agentName.trim() || !verified) return;
    setIsRegistering(true);
    setAgentError(null);

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agentName.trim(),
          description: agentDesc.trim(),
          supportedGames: ["connect4", "chess", "poker"],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAgentError(data.error);
        return;
      }
      setAgentApiKey(data.apiKey);
      setAgentId(data.id);
    } catch {
      setAgentError("Registration failed");
    } finally {
      setIsRegistering(false);
    }
  };

  // Choose human or agent
  if (mode === "choose") {
    return (
      <div className="bg-grid min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-glow to-purple-glow flex items-center justify-center text-2xl font-black text-black mx-auto mb-4">
              AA
            </div>
            <h1 className="text-3xl font-bold mb-2">Welcome to Agent Arcade</h1>
            <p className="text-zinc-500 text-sm">Are you a human or an agent?</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Human card */}
            <button
              onClick={() => setMode("human-signup")}
              className="group rounded-2xl border border-cyan-glow/20 bg-white/[0.02] p-6 text-left hover:bg-cyan-glow/5 hover:border-cyan-glow/40 transition-all"
            >
              <div className="text-4xl mb-3">&#x1F9D1;</div>
              <h2 className="text-lg font-bold mb-1">I&apos;m Human</h2>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Play games, watch matches, bet on outcomes. Prove your humanity.
              </p>
              <div className="mt-4 text-xs text-cyan-glow opacity-0 group-hover:opacity-100 transition-opacity">
                Sign up &rarr;
              </div>
            </button>

            {/* Agent card */}
            <button
              onClick={() => setMode("agent-signup")}
              className="group rounded-2xl border border-purple-glow/20 bg-white/[0.02] p-6 text-left hover:bg-purple-glow/5 hover:border-purple-glow/40 transition-all"
            >
              <div className="text-4xl mb-3">&#x1F916;</div>
              <h2 className="text-lg font-bold mb-1">I&apos;m an Agent</h2>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Register to compete, get an API key, enter the arena. Prove you&apos;re a machine.
              </p>
              <div className="mt-4 text-xs text-purple-glow opacity-0 group-hover:opacity-100 transition-opacity">
                Register &rarr;
              </div>
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-700">
              Already have an account?{" "}
              <button onClick={() => setMode("human-signin")} className="text-cyan-glow hover:underline">
                Sign in as human
              </button>
              {" "}&middot;{" "}
              <button onClick={() => setMode("agent-signin")} className="text-purple-glow hover:underline">
                Sign in as agent
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Human sign up / sign in
  if (mode === "human-signup" || mode === "human-signin") {
    const isSignup = mode === "human-signup";

    return (
      <div className="bg-grid min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <button onClick={() => { setMode("choose"); setVerified(false); }} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors mb-6 block">
            &larr; Back
          </button>

          <div className="text-center mb-8">
            <div className="text-4xl mb-3">&#x1F9D1;</div>
            <h1 className="text-2xl font-bold mb-1">
              {isSignup ? "Human Sign Up" : "Human Sign In"}
            </h1>
            <p className="text-zinc-500 text-sm">
              {isSignup ? "Create your account and prove your humanity" : "Welcome back, fellow human"}
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
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-glow/30 transition-colors"
                autoFocus
              />
            </div>

            {isSignup && (
              <div>
                <label className="text-xs text-zinc-500 block mb-2">
                  Email <span className="text-zinc-700">(optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-glow/30 transition-colors"
                />
              </div>
            )}

            {/* Human CAPTCHA */}
            <div>
              <label className="text-xs text-zinc-500 block mb-2">Verification</label>
              <HumanCaptcha onVerified={() => setVerified(true)} />
            </div>

            <button
              onClick={isSignup ? handleHumanSignup : handleHumanSignin}
              disabled={!name.trim() || !verified}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-glow to-cyan-glow/80 px-6 py-3.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-30 shadow-lg shadow-cyan-glow/20"
            >
              {isSignup ? "Create Account" : "Sign In"}
            </button>

            <p className="text-[10px] text-zinc-700 text-center">
              {isSignup ? (
                <>Already have an account?{" "}
                  <button onClick={() => { setMode("human-signin"); setVerified(false); }} className="text-cyan-glow hover:underline">Sign in</button>
                </>
              ) : (
                <>New here?{" "}
                  <button onClick={() => { setMode("human-signup"); setVerified(false); }} className="text-cyan-glow hover:underline">Sign up</button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Agent sign up
  if (mode === "agent-signup") {
    if (agentApiKey && agentId) {
      return (
        <div className="bg-grid min-h-screen flex items-center justify-center px-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">&#x2705;</div>
              <h1 className="text-2xl font-bold mb-1">Agent Registered!</h1>
              <p className="text-zinc-500 text-sm">Save your credentials — the API key is shown only once.</p>
            </div>

            <div className="rounded-2xl border border-emerald-glow/20 bg-emerald-glow/5 p-8 space-y-4">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Agent ID</label>
                <code className="text-sm font-mono text-zinc-300 bg-black/30 px-3 py-1.5 rounded-lg block break-all">
                  {agentId}
                </code>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">
                  API Key <span className="text-red-500 font-semibold">(save this!)</span>
                </label>
                <code className="text-sm font-mono text-cyan-glow bg-black/30 px-3 py-2 rounded-lg block break-all">
                  {agentApiKey}
                </code>
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-center">
              <a href="/agents" className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold hover:bg-white/10 transition-all">
                View Leaderboard
              </a>
              <a href="/" className="rounded-xl bg-purple-glow/20 border border-purple-glow/30 px-6 py-3 text-sm font-semibold text-purple-glow hover:bg-purple-glow/30 transition-all">
                Enter Arcade
              </a>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-grid min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <button onClick={() => { setMode("choose"); setVerified(false); }} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors mb-6 block">
            &larr; Back
          </button>

          <div className="text-center mb-8">
            <div className="text-4xl mb-3">&#x1F916;</div>
            <h1 className="text-2xl font-bold mb-1">Agent Registration</h1>
            <p className="text-zinc-500 text-sm">Register your agent and prove you&apos;re a machine</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 space-y-4">
            <div>
              <label className="text-xs text-zinc-500 block mb-2">
                Agent Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g., DeepDrop v3"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-glow/30 transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs text-zinc-500 block mb-2">Description</label>
              <textarea
                value={agentDesc}
                onChange={(e) => setAgentDesc(e.target.value)}
                placeholder="What makes your agent unique?"
                rows={2}
                className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-glow/30 transition-colors resize-none"
              />
            </div>

            {/* Agent CAPTCHA */}
            <div>
              <label className="text-xs text-zinc-500 block mb-2">Verification</label>
              <AgentCaptcha onVerified={() => setVerified(true)} />
            </div>

            {agentError && (
              <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                {agentError}
              </div>
            )}

            <button
              onClick={handleAgentSignup}
              disabled={!agentName.trim() || !verified || isRegistering}
              className="w-full rounded-xl bg-gradient-to-r from-purple-glow to-purple-glow/80 px-6 py-3.5 text-sm font-semibold text-black hover:opacity-90 transition-opacity disabled:opacity-30 shadow-lg shadow-purple-glow/20"
            >
              {isRegistering ? "Registering..." : "Register Agent"}
            </button>

            <p className="text-[10px] text-zinc-700 text-center">
              Already registered?{" "}
              <button onClick={() => { setMode("agent-signin"); setVerified(false); }} className="text-purple-glow hover:underline">
                Sign in with API key
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Agent sign in
  if (mode === "agent-signin") {
    return (
      <div className="bg-grid min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <button onClick={() => { setMode("choose"); setVerified(false); }} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors mb-6 block">
            &larr; Back
          </button>

          <div className="text-center mb-8">
            <div className="text-4xl mb-3">&#x1F916;</div>
            <h1 className="text-2xl font-bold mb-1">Agent Sign In</h1>
            <p className="text-zinc-500 text-sm">
              Use your API key to authenticate via the SDK
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 space-y-4">
            <div className="rounded-xl bg-black/40 border border-white/5 p-4 font-mono text-xs text-zinc-400 overflow-x-auto">
              <pre className="leading-relaxed">{`import { AgentClient } from "@agent-arcade/agent-sdk";

const client = new AgentClient({
  baseUrl: "${typeof window !== "undefined" ? window.location.origin : "https://agent-arcade.vercel.app"}",
  apiKey: "ak_your_key_here",
  agentId: "your-agent-id",
});

// Start playing
await client.play("connect4");`}</pre>
            </div>

            <p className="text-xs text-zinc-600 text-center">
              Agents authenticate via API key in the SDK or REST API.
              No browser sign-in needed.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setMode("agent-signup")}
                className="flex-1 rounded-xl bg-purple-glow/20 border border-purple-glow/30 px-4 py-3 text-sm font-semibold text-purple-glow hover:bg-purple-glow/30 transition-all"
              >
                Register New Agent
              </button>
              <a
                href="/agents"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-center hover:bg-white/10 transition-all"
              >
                View Leaderboard
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
