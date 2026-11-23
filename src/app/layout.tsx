import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "OSS Contribution Lab | Understand GitHub Repos",
  description:
    "Explore public GitHub repos, ask questions grounded in code, export a digest for local LLMs, and track issues, pull requests, and commits.",
  keywords: [
    "GitHub repository explorer",
    "open source contributions",
    "codebase onboarding",
    "repository digest",
    "codebase Q&A",
    "AI for developers",
    "local LLM context",
    "GitHub issues tracker",
    "pull request tracking",
  ],
  openGraph: {
    title: "Your codebase, an open book. | OSS Contribution Lab",
    description:
      "Understand a public GitHub codebase, ask questions with repository context, and follow issues, pull requests, and commits in one workspace.",
  },
  icons: [{ rel: "icon", url: "/logo.png" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <body>
        <ClerkProvider>
          <TRPCReactProvider>{children}</TRPCReactProvider>
          <Toaster richColors />
        </ClerkProvider>
      </body>
    </html>
  );
}
