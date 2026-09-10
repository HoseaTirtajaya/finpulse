import { Suspense } from "react";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { WatchlistProvider } from "@/components/watchlist-provider";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["SOFT", "WONK", "opsz"],
});

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "FinPulse — Financial news & AI recommendations",
  description:
    "Gather financial news, manage a watchlist, and rank ideas with transparent AI-assisted research briefs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans text-[var(--fp-ink)]">
        <WatchlistProvider>
          <Suspense
            fallback={
              <div className="h-16 border-b border-[var(--fp-line)]" />
            }
          >
            <SiteHeader />
          </Suspense>
          {children}
        </WatchlistProvider>
      </body>
    </html>
  );
}
