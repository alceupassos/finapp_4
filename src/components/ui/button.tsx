import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 border",
  {
    variants: {
      variant: {
        default: "bg-card text-foreground border-border hover:bg-[#0f141b]",
        primary: "bg-primary text-primary-foreground border-transparent hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/90",
        destructive: "bg-destructive text-destructive-foreground border-transparent hover:bg-destructive/90",
        success: "bg-success text-success-foreground border-transparent hover:bg-success/90",
        warning: "bg-warning text-warning-foreground border-transparent hover:bg-warning/90",
        info: "bg-info text-info-foreground border-transparent hover:bg-info/90",
        ghost: "bg-transparent text-foreground border-transparent hover:bg-muted/40",
        outline: "bg-transparent text-foreground border-border hover:bg-muted/30",
        accent: "bg-accent border-border text-accent-foreground data-[active=true]:bg-accent/90",
      },
      size: {
        default: "h-9 px-3 py-2",
        sm: "h-8 px-2",
        lg: "h-10 px-4",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
