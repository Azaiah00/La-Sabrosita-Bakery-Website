/**
 * Root layout — a passthrough on purpose.
 *
 * `<html>` and `<body>` are rendered by the layouts underneath: the
 * public site in `[locale]/layout.tsx` (which needs `lang` to follow the
 * routed locale), and the staff routes in `portal/` and `admin/` (which
 * carry no locale prefix and read theirs from a cookie).
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
