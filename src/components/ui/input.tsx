import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-xl border border-[#131c26] bg-[#0a0f14] px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/10",
        className
      )}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }
