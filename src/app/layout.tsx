import type { Metadata } from 'next';
import {
  JetBrains_Mono,
  Noto_Sans_Bengali,
  Plus_Jakarta_Sans,
} from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const fontSansEn = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans-en',
});

const fontSansBn = Noto_Sans_Bengali({
  subsets: ['bengali'],
  variable: '--font-sans-bn',
});

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-code',
});

export const metadata: Metadata = {
  title: 'SeatZero — Workshop & Meetup Box Office',
  description: 'দ্রুত ও নিরাপদ ইভেন্ট টিকিট বুকিং প্ল্যাটফর্ম',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontSansEn.variable} ${fontSansBn.variable} ${fontMono.variable}`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
