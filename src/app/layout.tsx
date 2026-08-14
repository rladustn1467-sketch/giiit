import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "영화 감상 기록",
  description: "영화 감상 기록과 AI 챗봇 대화를 남기는 개인 아카이브",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100">
        <header className="border-b border-neutral-800 sticky top-0 bg-neutral-950/90 backdrop-blur z-10">
          <nav className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold tracking-tight">
              🎬 영화 감상 기록
            </Link>
            <Link
              href="/movies/new"
              className="text-sm px-3 py-1.5 rounded-md bg-neutral-100 text-neutral-900 hover:bg-white transition-colors"
            >
              영화 등록
            </Link>
          </nav>
        </header>
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
