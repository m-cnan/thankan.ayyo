import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Oswald } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/error-boundary";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: 'swap',
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Thankan.Ayyo - Your Friendly Malayali Uncle Chatbot",
  description: "Chat with Thankan, a humorous Malayali uncle who's got stories, advice, and sarcasm in equal measure. Two modes: friendly uncle or brutally honest!",
  keywords: ["Malayali", "chatbot", "Kerala", "humor", "AI", "uncle", "Malayalam"],
  authors: [{ name: "Thankan.Ayyo Team" }],
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${oswald.variable} antialiased font-sans`}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
