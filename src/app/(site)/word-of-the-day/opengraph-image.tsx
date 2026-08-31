import { ImageResponse } from 'next/og'
import { getWordOfTheDay, splitSyllables, londonFormat, londonToday } from '@/lib/word-of-the-day'

/**
 * The link preview.
 *
 * Generated per request so a link shared on any day shows that day's word,
 * which is the whole point of sharing it. Only flat fills and system-safe
 * fonts — next/og renders a restricted subset of CSS, so this mirrors the
 * card's composition rather than importing its styles.
 *
 * Edge rather than Node: it is the documented runtime for ImageResponse, and
 * the Node build of @vercel/og resolves its own asset path through
 * fileURLToPath(import.meta.url), which throws "Invalid URL" on a Windows
 * drive path during prerender. Edge also skips build-time prerendering, which
 * suits an image whose content changes daily.
 */
export const runtime = 'edge'
export const revalidate = 3600
export const alt = 'Word of the day from Spirit of Excellence Tuition'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const entry = getWordOfTheDay()
  const date = londonFormat(londonToday(), { day: 'numeric', month: 'long' })
  const syllables = splitSyllables(entry)

  // Long words have to come down or they run off the card.
  const wordSize = entry.word.length > 10 ? 92 : entry.word.length > 7 ? 116 : 140

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: '#F5F7F6',
          padding: 56,
          fontFamily: 'Georgia, serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
            background: '#E8613C',
            border: '7px solid #12181F',
            borderRadius: 40,
            boxShadow: '16px 16px 0 0 #12181F',
            padding: '46px 54px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                background: 'rgba(255,255,255,0.22)',
                color: '#fff',
                borderRadius: 999,
                padding: '10px 22px',
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 2,
              }}
            >
              WORD OF THE DAY
            </div>
            <div style={{ display: 'flex', color: 'rgba(255,255,255,0.8)', fontSize: 24 }}>
              {date}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                fontSize: wordSize,
                fontWeight: 700,
                color: '#fff',
                letterSpacing: -4,
                lineHeight: 1,
              }}
            >
              {entry.word}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              {syllables.map((s, i) => (
                <div
                  key={`${s}-${i}`}
                  style={{
                    display: 'flex',
                    background: i % 2 === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(18,24,31,0.22)',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '6px 14px',
                    fontSize: 30,
                    fontWeight: 700,
                  }}
                >
                  {s}
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                marginTop: 22,
                color: 'rgba(255,255,255,0.92)',
                fontSize: 30,
                textAlign: 'center',
                maxWidth: 900,
              }}
            >
              {entry.definition}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', color: '#fff', fontSize: 26, fontWeight: 700 }}>
              soetuition.com
            </div>
            <div style={{ display: 'flex', color: 'rgba(255,255,255,0.75)', fontSize: 22 }}>
              Tuition with Ms Betty
            </div>
          </div>
        </div>
      </div>
    ),
    size
  )
}
