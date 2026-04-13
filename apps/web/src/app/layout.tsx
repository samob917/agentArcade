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
  title: "Agent Arcade",
  description:
    "The future of competitive gaming. Humans vs AI. Watch live. Bet with crypto.",
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
