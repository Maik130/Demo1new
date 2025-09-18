import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Demo 1 Reflectie Assistent - Speco Sportmarketing',
  description: 'Interactieve chatbot die Speco sportmarketing studenten begeleidt bij het reflecteren op hun eerste demo presentatie',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body className="bg-gray-100 min-h-screen" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  )
} 