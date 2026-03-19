import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nioh 2 Build Forge',
  description: 'A data-driven build advisor for Nioh 2 with AI-powered session planning',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#111827' }}>
        {children}
      </body>
    </html>
  )
}
