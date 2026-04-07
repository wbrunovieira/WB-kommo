import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WB Kommo — CRM',
  description: 'CRM SaaS para gestão de leads e pipelines',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
