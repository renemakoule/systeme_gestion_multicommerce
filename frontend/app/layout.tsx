import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TitleBar } from "@/components/title-bar";
import { AppTabsProvider } from "@/components/AppTabsContext";
import { AppTabsLayout } from "@/components/AppTabsLayout";
import { MainLayoutWrapper } from "@/components/MainLayoutWrapper";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GASNexus",
  description: "Global All Services Management System - Professional Business Hub",
  icons: {
    icon: "/logo_premium.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning est indispensable sur la balise html
    // quand on utilise next-themes
    <html lang="fr" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen overflow-hidden`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={true}
          disableTransitionOnChange
          enableColorScheme={false}
        >
          {/* L'ordre est important : le background doit être appliqué sur une div interne */}
          <div className="relative flex flex-col h-full bg-background text-foreground transition-colors duration-500">
            <AppTabsProvider>
              <TitleBar />
              <MainLayoutWrapper>
                <AppTabsLayout>{children}</AppTabsLayout>
              </MainLayoutWrapper>
            </AppTabsProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
