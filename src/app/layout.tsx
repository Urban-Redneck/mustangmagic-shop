import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "MustangMagic.com",
  description:
    "Mustang Magic & American Speed in Deer Park, New York offers Mustang performance services, dyno tuning, installations, diagnostics, and an online Mustang parts catalog.",
  metadataBase: new URL("https://mustangmagic.com"),
  openGraph: {
    title: "MustangMagic.com",
    description:
      "Mustang performance services, dyno tuning, installations, diagnostics, and carefully selected Mustang parts.",
    url: "/",
    siteName: "MustangMagic.com",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
