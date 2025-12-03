import '@/styles/globals.css'
import '@/styles/variables.css'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body className="min-h-screen bg-[var(--color-ui-bg)] text-white">{children}</body>
    </html>
  )
}