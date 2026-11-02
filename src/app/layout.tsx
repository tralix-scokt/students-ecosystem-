import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/cormorant-garamond";
import "@fontsource-variable/cormorant-garamond/wght-italic.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "E-LEARNING ECOSYSTEM — Powered by TRALIX AI",
    template: "%s | E-LEARNING ECOSYSTEM",
  },
  description:
    "Your Future Starts With Knowledge. Learn with purpose. Understand with confidence. Prepare for success. Powered by TRALIX AI.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#02050e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-obsidian-950 font-sans text-white antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:border focus:border-electric-400 focus:bg-obsidian-950 focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-electric-300 focus:shadow-cyan-glow"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
