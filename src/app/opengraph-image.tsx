import { ImageResponse } from 'next/og'
import { site } from '@/lib/site'

/**
 * The card people see when the site is shared — WhatsApp, Facebook, iMessage,
 * Google's preview. Until now there was none at all, so a shared link showed a
 * bare URL, which is exactly the moment a parent decides whether to tap.
 *
 * Deliberately no webfont and no bitmap logo: both are work on a path that
 * must never fail. Inlining the real logo as a data URI made next/og throw
 * "Invalid URL" and pushed the render past the build worker's timeout, so the
 * mark is drawn instead. The brand carries through colour and shape.
 */
export const runtime = 'edge'
export const alt = `${site.name} — ${site.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#F5F7F6',
          padding: '64px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Warm wash so the card is not a flat rectangle */}
        <div
          style={{
            position: 'absolute',
            top: -180,
            right: -160,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: 'rgba(232,97,60,0.13)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -220,
            left: -140,
            width: 560,
            height: 560,
            borderRadius: 9999,
            background: 'rgba(30,122,112,0.12)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 84,
              height: 84,
              borderRadius: 22,
              background: '#E8613C',
              color: '#fff',
              fontSize: 40,
              fontWeight: 800,
            }}
          >
            SE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: '#12181F', letterSpacing: -0.5 }}>
              {site.name}
            </div>
            <div style={{ fontSize: 20, color: '#6B7684', marginTop: 2 }}>{site.tagline}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 900 }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 800,
              color: '#12181F',
              lineHeight: 1.08,
              letterSpacing: -2,
              display: 'flex',
              flexWrap: 'wrap',
            }}
          >
            Primary tuition that builds
            <span style={{ color: '#E8613C', marginLeft: 16 }}>confidence.</span>
          </div>
          {/* One pre-joined string: satori counts each interpolation as a
              separate child, and a multi-child div without display:flex throws. */}
          <div
            style={{
              display: 'flex',
              fontSize: 27,
              color: '#39434F',
              marginTop: 22,
              lineHeight: 1.4,
            }}
          >
            {`Reception to Year 6, plus 11+ preparation — with ${site.owner}.`}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {['Small groups', 'One-to-one', '11+ English & VR', 'Free resources'].map((t) => (
            <div
              key={t}
              style={{
                display: 'flex',
                fontSize: 21,
                fontWeight: 700,
                color: '#12554E',
                background: '#E3F1EF',
                padding: '11px 22px',
                borderRadius: 9999,
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  )
}
