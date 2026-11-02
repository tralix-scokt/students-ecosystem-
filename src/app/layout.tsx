import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/cormorant-garamond";
import "@fontsource-variable/cormorant-garamond/wght-italic.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://students-ecosystem.vercel.app"
  ),
  title: {
    default: "E-Learning Ecosystem — Powered by TRALIX AI",
    template: "%s | E-Learning Ecosystem",
  },
  description:
    "Learn • Practice • Excel. Your Complete Learning and Success Platform — Powered by TRALIX AI.",
  openGraph: {
    title: "E-Learning Ecosystem — Powered by TRALIX AI",
    description:
      "Learn • Practice • Excel. Structured Learning, Multimodal AI Tutor, and JAMB/WAEC/NECO Past-Question CBT.",
    images: [
      {
        url: "/brand/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "E-Learning Ecosystem — Learn • Practice • Excel — Powered by TRALIX AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "E-Learning Ecosystem — Powered by TRALIX AI",
    description:
      "Learn • Practice • Excel. Your Complete Learning and Success Platform.",
    images: ["/brand/opengraph-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#02050e",
};

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('se-theme-preference');if(t==='light'||t==='dark'||t==='default'){document.documentElement.setAttribute('data-theme',t);if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}else{document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-theme="default" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
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
