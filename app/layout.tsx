import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'PharmaVerify',
  description: 'NAFDAC Drug Verification & Safety Portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}