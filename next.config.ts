import createNextIntlPlugin from 'next-intl/plugin'
import type { NextConfig } from 'next'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/**
 * Demo mode must never reach a real production deploy.
 *
 * `npm run demo:build` sets ALLOW_DEMO_BUILD=true and is the only sanctioned
 * way to produce a demo bundle. Any other production build that finds
 * NEXT_PUBLIC_DEMO_MODE=true fails here, loudly, before a single page is
 * emitted — see PROMPT-00 Part D.
 */
if (
  process.env.NODE_ENV === 'production' &&
  process.env.NEXT_PUBLIC_DEMO_MODE === 'true' &&
  process.env.ALLOW_DEMO_BUILD !== 'true'
) {
  throw new Error(
    'NEXT_PUBLIC_DEMO_MODE=true reached a production build. ' +
      'Demo mode serves fixtures, stubs payments and never sends a message — ' +
      'it must not ship. Unset NEXT_PUBLIC_DEMO_MODE, or run `npm run demo:build` ' +
      'if you deliberately want a sales-demo bundle.',
  )
}

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  // The repo lives under OneDrive, where a stray lockfile higher up the
  // tree makes Next guess the wrong workspace root. Pin it.
  outputFileTracingRoot: import.meta.dirname,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        // Storage bucket for product photography. Unreachable in demo mode —
        // every fixture image is local. Wired for real after the sale.
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default withNextIntl(nextConfig)
