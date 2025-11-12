import * as React from "react"
import { cn } from "../../lib/utils"

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("text-[11px] px-2 py-0.5 rounded-md", className)} {...props} />
}
