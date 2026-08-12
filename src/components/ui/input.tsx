import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Re-tokenized to DESIGN.md on the way in:
 *
 * - `min-h-12`, not `h-9`. §6: 48px minimum target, and a form field is
 *   the most-tapped control on a phone.
 * - `rounded-sm` (8px) — §4 assigns 8px to "chips, badges, inputs".
 * - Type stays at 16px. Stock drops to 14px at `md:`; below 16px iOS
 *   Safari zooms the viewport on focus, which breaks the layout mid-form.
 * - Solid 3px focus ring at 2px offset, per §6.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "min-h-12 w-full min-w-0 rounded-sm border border-input bg-transparent px-4 py-2 text-base",
        "font-ui outline-none transition-[opacity] duration-160",
        // Selection highlight, not a hover surface — `accent-soft` reads as
        // a highlight on paper and on velvet without spending the accent.
        "selection:bg-accent-soft selection:text-ink",
        "file:inline-flex file:min-h-10 file:border-0 file:bg-transparent file:text-body file:font-medium file:text-foreground",
        "placeholder:text-muted-foreground",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "dark:bg-input/30",
        "focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
