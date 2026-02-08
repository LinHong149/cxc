import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sherlock Combs',
  description: 'Parse and analyze PDF documents',
  icons: { icon: '/logo.png' },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
