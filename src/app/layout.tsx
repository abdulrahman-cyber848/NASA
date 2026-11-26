import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/state/app';
import Starfield from '@/components/Starfield';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Toasts } from '@/components/ui';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'LunaNav — Daily Moon Guide',
  applicationName: 'LunaNav',
  openGraph: { siteName: 'LunaNav', title: 'LunaNav — Daily Moon Guide' },
  description: 'An independent educational Daily Moon Guide: computed phases, terminator mapping, a 3D Moon explorer, lunar calendar and observing journal. Not an official NASA product.',
  icons: {
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="14" fill="%23101D32"/%3E%3Cpath d="M16 2a14 14 0 0 1 0 28 11 11 0 0 0 0-28z" fill="%2353D8E8"/%3E%3C/svg%3E',
  },
};

export const viewport: Viewport = { themeColor: '#080E1B', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppProvider>
          <a href="#main" className="skip-link btn btn-primary btn-sm">Skip to content</a>
          <Starfield />
          <Navbar />
          <main id="main" className="relative z-10 min-h-[70vh]">{children}</main>
          <Footer />
          <Toasts />
          <Analytics />
        </AppProvider>
      </body>
    </html>
  );
}
