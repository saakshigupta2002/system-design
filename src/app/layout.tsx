import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClarityAnalytics } from "@/components/Clarity";
import { SnagRecorder } from "@/components/Snag";
import "./globals.css";

// One grotesque handles body + display (differentiated by weight + tracking).
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

// Monospace is scoped to data/numbers only (tabular + slashed-zero figures).
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SystemDesign — System Design Simulator",
  description: "Interactive system design interview simulator with real-time load testing and scoring",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // The inline script below sets the `dark` class from the persisted theme
      // before React hydrates, so the html class can differ from SSR.
      suppressHydrationWarning
      className={`${hanken.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="h-full overflow-hidden bg-background text-foreground">
        {/* Apply persisted theme before first paint to avoid a flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('systemdesign-app');var t=s&&JSON.parse(s).state&&JSON.parse(s).state.theme;document.documentElement.classList.toggle('dark',t!=='light');}catch(e){}})();`,
          }}
        />
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <ClarityAnalytics />
        <SnagRecorder />
      </body>
    </html>
  );
}
