import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Othership',
  description: 'Cooperative survival horror game in space',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
