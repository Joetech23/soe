/** @type {import('next').NextConfig} */

const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host
  } catch {
    return ''
  }
})()

/**
 * Content-Security-Policy.
 *
 * 'unsafe-inline' on style-src is required by Next's inlined critical CSS and
 * styled-jsx; 'unsafe-inline'/'unsafe-eval' on script-src is required by the
 * Next dev overlay only, so it is dropped in production.
 *
 * connect-src is pinned to the Supabase project + payment providers so a
 * compromised dependency cannot quietly exfiltrate to an arbitrary host.
 */
function csp() {
  const dev = process.env.NODE_ENV !== 'production'
  const sb = supabaseHost ? `https://${supabaseHost} wss://${supabaseHost}` : ''
  return [
    `default-src 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `img-src 'self' data: blob: https://*.supabase.co`,
    `font-src 'self' data:`,
    `style-src 'self' 'unsafe-inline'`,
    dev
      ? `script-src 'self' 'unsafe-inline' 'unsafe-eval'`
      : `script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.paypal.com https://www.sandbox.paypal.com`,
    `frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.paypal.com https://www.sandbox.paypal.com https://player.vimeo.com`,
    `connect-src 'self' ${sb} https://api.stripe.com https://api.paypal.com https://api-m.sandbox.paypal.com`,
    // Production only: on localhost this would rewrite http://localhost to
    // https://localhost and every request would fail with an SSL error.
    dev ? '' : 'upgrade-insecure-requests',
  ]
    .filter(Boolean)
    .join('; ')
}

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp() },
  // 2 years, preload-eligible. Only meaningful once served over HTTPS.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
]

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost }]
      : [],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Never let a proxy or browser cache an authenticated or money-touching
      // response.
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex' },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/account/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ]
  },
}

export default nextConfig
