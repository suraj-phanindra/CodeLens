import type { Metadata } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import 'allotment/dist/style.css';
import './globals.css';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'Atrium. See how they think.',
  description: 'Atrium replaces LeetCode interviews with paid, real-world challenges. An AI observation layer reveals how candidates actually reason, debug, and build.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased bg-[#09090b] text-[#fafafa]`}
      >
        {children}
      </body>
    </html>
  );
}
