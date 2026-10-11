import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });

export const metadata: Metadata = {
  title: { default: "WordQuest — English crossword missions", template: "%s · WordQuest" },
  description: "Learn English grammar, speaking and world knowledge by solving crossword missions.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d17" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${jakarta.variable} ${grotesk.variable}`}>
      <body className="bg-blobs font-sans">
        <Providers>
          <Header />
          <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:pt-10">{children}</main>
          <footer className="border-t hairline py-8 text-center text-xs muted">
            WordQuest · learn English one crossword at a time
          </footer>
        </Providers>
      </body>
    </html>
  );
}
