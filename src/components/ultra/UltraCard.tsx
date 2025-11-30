import { ReactNode } from 'react'

export function UltraCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`ultra-card ${className}`}>{children}</div>
}

