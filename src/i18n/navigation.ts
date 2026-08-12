import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

/**
 * Locale-aware navigation. Every internal link goes through these — never
 * `next/link` directly on a public route, or the Spanish slug leaks into
 * the English tree.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
