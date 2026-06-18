import type { Metadata } from 'next'
import { Outfit, Manrope, Lobster, Inter } from 'next/font/google'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' })
const lobster = Lobster({ subsets: ['latin'], weight: '400', variable: '--font-lobster', display: 'swap' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'DuoLink Admin',
  description: 'DuoLink Administration Portal',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${manrope.variable} ${lobster.variable} ${inter.variable}`}>
      <body className={outfit.className}>{children}</body>
    </html>
  )
}
