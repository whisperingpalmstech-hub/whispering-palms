import type { Metadata } from "next";
import "./globals.css";
import { TranslationProvider } from "./contexts/TranslationContext";

export const metadata: Metadata = {
  title: "Whispering Palms - Online Palmistry & Vedic Astrology Readings | Palm Reading Expert",
  description: "Get personalized palm reading and Vedic astrology insights from expert astrologers. Discover your destiny through ancient palmistry wisdom, birth chart analysis, and horoscope predictions. Trusted by thousands worldwide for accurate life guidance.",
  keywords: [
    "palmistry online",
    "palm reading service",
    "vedic astrology",
    "astrology reading",
    "horoscope prediction",
    "birth chart analysis",
    "palm lines meaning",
    "destiny prediction",
    "life path guidance",
    "indian astrology",
    "jyotish",
    "kundli matching",
    "numerology",
    "future prediction",
    "love compatibility",
    "career astrology",
    "marriage prediction"
  ].join(", "),
  authors: [{ name: "Whispering Palms" }],
  creator: "Whispering Palms",
  publisher: "Whispering Palms",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://whispering-palms.org'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'Whispering Palms - Online Palmistry & Vedic Astrology Readings',
    description: 'Discover your destiny with expert palm reading and Vedic astrology. Get personalized insights about love, career, health, and life path from certified astrologers.',
    siteName: 'Whispering Palms',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Whispering Palms - Palm Reading and Astrology Services',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Whispering Palms - Online Palmistry & Astrology',
    description: 'Expert palm reading and Vedic astrology insights for your life journey',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes when ready
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-17920189789"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', 'AW-17920189789');
            `,
          }}
        />
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Whispering Palms",
              "description": "Expert palmistry and Vedic astrology services for personalized life guidance",
              "url": process.env.NEXT_PUBLIC_APP_URL || "https://whispering-palms.org",
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": `${process.env.NEXT_PUBLIC_APP_URL || "https://whispering-palms.org"}/search?q={search_term_string}`
                },
                "query-input": "required name=search_term_string"
              },
              "sameAs": [
                // Add your social media links here when ready
              ]
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ProfessionalService",
              "name": "Whispering Palms",
              "image": `${process.env.NEXT_PUBLIC_APP_URL || "https://whispering-palms.org"}/logo.png`,
              "description": "Professional palmistry and Vedic astrology readings by certified astrologers. Get insights about love, career, health, and life path.",
              "keywords": "palmistry, palm reading, vedic astrology, horoscope, birth chart, kundli, jyotish",
              "priceRange": "$$",
              "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "Astrology Services",
                "itemListElement": [
                  {
                    "@type": "Offer",
                    "itemOffered": {
                      "@type": "Service",
                      "name": "Basic Palm Reading",
                      "description": "24-hour personalized palm analysis and astrological insights"
                    }
                  },
                  {
                    "@type": "Offer",
                    "itemOffered": {
                      "@type": "Service",
                      "name": "Premium Astrology Reading",
                      "description": "Detailed Vedic astrology consultation with birth chart analysis"
                    }
                  }
                ]
              }
            }),
          }}
        />
        {/* Stripe.js */}
        {process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
          <script src="https://js.stripe.com/v3/" async></script>
        )}
      </head>
      <body className="font-sans">
        <TranslationProvider>
          {children}
        </TranslationProvider>
      </body>
    </html>
  );
}
