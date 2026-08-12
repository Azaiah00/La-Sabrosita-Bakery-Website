/**
 * The one place in `src/` outside `tokens.css` where a hex literal is
 * allowed to exist — and only because email demands it.
 *
 * Email clients do not support CSS custom properties. A template that
 * writes `color: var(--ink)` renders as unstyled black-on-white in
 * Outlook and Gmail's clipped view, so the values have to be inlined.
 *
 * Every value below is copied from DESIGN.md §2. If a token changes
 * there, change it here too — this file is a mirror, never a source.
 *
 * Light-mode values only. Email has no reliable dark mode, and a
 * half-supported one is worse than none.
 */
export const EMAIL_PALETTE = {
  ink: '#191918',        // --ink
  inkMuted: '#6B6157',   // --ink-muted
  bg: '#FDFBF6',         // --bg
  surface: '#FFFFFF',    // --surface
  line: '#E4D8C4',       // --line
  accent: '#D16639',     // --accent
  accentStrong: '#B85328', // --accent-strong  (4.88:1 on white)
  accentSoft: '#F7E3D6', // --accent-soft
  wheat: '#E2AA67',      // --wheat
  danger: '#A83232',     // --danger
} as const
