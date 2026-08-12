import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Re-tokenized to DESIGN.md §6 on the way in. Changes from stock shadcn:
 *
 * - Radius is `full`. DESIGN.md §6 specifies a pill for every button.
 * - Every size floors at 48×48. §6: "Minimum tap target 48×48px
 *   everywhere." The size variants still differ in padding and type
 *   scale; they no longer differ in whether you can hit them.
 * - Hover surfaces are `surface-sunk`, not `accent`. §2.3 allows exactly
 *   one accent and a dropdown hover is not on its list.
 * - Focus ring is a solid 3px at 2px offset, not a 50%-opacity 3px with
 *   no offset. §6 again, and it must survive both themes.
 * - `secondary` is the transparent/2px-ink treatment from the §6 table,
 *   not shadcn's grey fill.
 * - `destructive` text comes from a token. Stock ships `text-white`,
 *   which is 2.6:1 on the dark-theme danger colour — a hard fail.
 * - Transition is transform+opacity only. §7 forbids animating box-shadow.
 */
const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full",
    "min-h-12 min-w-12",
    "font-ui text-body font-semibold whitespace-nowrap",
    "outline-none transition-[transform,opacity] duration-160 ease-out",
    "motion-safe:hover:-translate-y-0.5 active:translate-y-0",
    "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
    "disabled:pointer-events-none disabled:opacity-50",
    "aria-invalid:border-destructive",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border-2 border-line-strong bg-transparent text-ink hover:bg-surface-sunk",
        secondary: "border-2 border-ink bg-transparent text-ink hover:bg-surface-sunk",
        ghost: "text-accent-strong hover:bg-surface-sunk",
        link: "text-accent-strong underline decoration-2 underline-offset-4",
      },
      size: {
        default: "px-6 py-3",
        xs: "gap-1 px-3 text-small [&_svg:not([class*='size-'])]:size-3",
        sm: "gap-1.5 px-4 text-body",
        lg: "px-8 text-base",
        icon: "size-12",
        "icon-xs": "size-12 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-12",
        "icon-lg": "size-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
