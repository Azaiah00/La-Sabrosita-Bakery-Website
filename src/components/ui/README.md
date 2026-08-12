# `components/ui` — shadcn primitives

Empty on purpose. `components.json` is configured, so
`npx shadcn@latest add <name>` works — **but do not run `init`**. It
rewrites `src/app/globals.css` with shadcn's default oklch palette, and
DESIGN.md §11 is explicit: default shadcn/Tailwind colors never ship.

The groundwork is already done. `globals.css` binds every shadcn role
(`background`, `foreground`, `card`, `popover`, `primary`, `secondary`,
`muted`, `destructive`, `border`, `input`, `ring`) to a token from
DESIGN.md §2, so an added primitive lands on the brand palette rather
than on neutral grey.

## Re-tokenize on the way in

DESIGN.md §11: *"Every component is re-tokenized to this file before it
is used."* Add a primitive in the prompt that needs it, not in advance,
and fix these two things before committing it:

1. **`accent` collides.** shadcn uses `accent` for subtle hover surfaces;
   ours is the terracotta, and §2.3 allows exactly one accent. Replace
   `bg-accent text-accent-foreground` with `bg-surface-sunk text-ink`
   wherever it appears as a hover or highlight state.

2. **Tap targets.** shadcn's default control heights are 36–40px.
   DESIGN.md §6 ships 48×48 minimum, and menu-adjacent copy never drops
   below 17px (`--t-menu`).

Then check the result in `/es` before `/en` — the Spanish string is the
layout constraint.
