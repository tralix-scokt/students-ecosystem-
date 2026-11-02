import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/cormorant-garamond";
import "@fontsource-variable/cormorant-garamond/wght-italic.css";
import "./globals.css";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://students-ecosystem.vercel.app"
).replace(/\/+$/, "");

const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() || undefined;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "E-Learning Ecosystem",
  title: {
    default:
      "E-Learning Ecosystem — JAMB, WAEC & NECO CBT + AI Tutor | Powered by TRALIX AI",
    template: "%s | E-Learning Ecosystem",
  },
  description:
    "Learn • Practice • Excel. Practice verified JAMB UTME, WAEC & NECO CBT past questions, snap homework photos for step-by-step AI Tutor explanations, and master structured courses — Powered by TRALIX AI.",
  keywords: [
    "E-Learning Ecosystem",
    "Students Ecosystem",
    "TRALIX AI",
    "JAMB CBT practice online",
    "JAMB UTME past questions",
    "WAEC past questions and answers",
    "NECO past questions CBT",
    "AI Tutor Nigeria",
    "snap photo solve math AI",
    "online exam preparation Nigeria",
    "university study platform Africa",
  ],
  authors: [{ name: "TRALIX AI" }],
  creator: "TRALIX AI",
  publisher: "E-Learning Ecosystem",
  category: "education",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  ...(GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: SITE_URL,
    siteName: "E-Learning Ecosystem",
    title: "E-Learning Ecosystem — Powered by TRALIX AI",
    description:
      "Learn • Practice • Excel. Structured Learning, Snap-a-Photo AI Tutor, and JAMB/WAEC/NECO Past-Question CBT.",
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
      "Learn • Practice • Excel. JAMB, WAEC & NECO Past-Question CBT + Multimodal AI Photo Tutor.",
    images: ["/brand/opengraph-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#02050e",
};

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('se-theme-preference');if(t==='light'||t==='dark'||t==='default'){document.documentElement.setAttribute('data-theme',t);if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}else{document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}}}catch(e){}})();`;

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "EducationalOrganization",
      "@id": `${SITE_URL}/#organization`,
      name: "E-Learning Ecosystem",
      alternateName: "Students Ecosystem — Powered by TRALIX AI",
      url: SITE_URL,
      logo: `${SITE_URL}/brand/logo-icon-512.png`,
      description:
        "Complete digital learning and exam preparation platform featuring structured lessons, multimodal AI Photo Tutor, and JAMB/WAEC/NECO CBT simulations.",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "E-Learning Ecosystem",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en-NG",
    },
    {
      "@type": "SoftwareApplication",
      name: "E-Learning Ecosystem",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web, iOS, Android",
      url: SITE_URL,
      image: `${SITE_URL}/brand/opengraph-image.png`,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "NGN",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-theme="default" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(ORGANIZATION_JSON_LD),
          }}
        />
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
