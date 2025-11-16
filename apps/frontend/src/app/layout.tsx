import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Marketplace - Multi-Vendor E-commerce Platform',
  description: 'Feature-rich multi-vendor marketplace for East Africa',
  keywords: ['marketplace', 'e-commerce', 'multi-vendor', 'Kenya', 'M-Pesa'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
