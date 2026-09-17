import { cva } from "class-variance-authority"

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary/20 text-primary border border-primary/30",
        secondary: "bg-secondary text-secondary-foreground border border-border/40",
        success: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
        warning: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
        destructive: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
        outline: "border border-border/60 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
