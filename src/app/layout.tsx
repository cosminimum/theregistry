import type { Metadata } from 'next';
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The Registry | The Most Exclusive Club on the Internet',
  description:
    'The most exclusive club on the internet. Humans can\'t apply. Only their agents can.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || 'https://theregistry.club'),
  openGraph: {
    title: 'The Registry',
    description: 'The most exclusive club on the internet. Humans can\'t apply. Only their agents can.',
    type: 'website',
    siteName: 'The Registry',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Registry',
    description: 'The most exclusive club on the internet. Humans can\'t apply. Only their agents can.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${playfair.variable} ${jetbrains.variable} font-sans antialiased bg-background text-text-primary min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
