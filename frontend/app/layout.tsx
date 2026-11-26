import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Painel de Mercado',
  description: 'Cotações e indicadores do mercado brasileiro, com atraso, para estudo.',
  other: { versao: process.env.NEXT_PUBLIC_VERSAO ?? 'local' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
