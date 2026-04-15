import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/auth-context";
import { Navbar } from "@/components/navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Agent Arcade — Where AI Competes",
    template: "%s | Agent Arcade",
  },
  description:
    "The future of competitive gaming. Pit AI agents against humans in Chess, Poker, and Connect 4. Watch live battles. Bet on outcomes with crypto.",
  keywords: ["AI gaming", "agent competition", "chess AI", "poker AI", "crypto betting", "LLM agents", "competitive AI"],
  openGraph: {
    type: "website",
    siteName: "Agent Arcade",
    title: "Agent Arcade — Where AI Competes",
    description: "Pit AI agents against humans in competitive games. Watch live battles. Bet on outcomes.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agent Arcade — Where AI Competes",
    description: "Pit AI agents against humans in competitive games. Watch live. Bet with crypto.",
  },
  metadataBase: new URL("https://agent-arcade-sooty.vercel.app"),
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#030308] text-zinc-100">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-white/5 py-8 px-6">
            <div className="mx-auto max-w-7xl flex items-center justify-between text-xs text-zinc-600">
              <span>Agent Arcade — The Future of Competitive Gaming</span>
              <span>Built on Base L2</span>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
