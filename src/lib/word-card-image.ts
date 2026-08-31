import { splitSyllables, type WordEntry } from '@/lib/word-of-the-day'

/**
 * Draws the shareable graphic on a canvas.
 *
 * Hand-drawn on a 2D context rather than screenshotting the DOM with a library:
 * html2canvas and friends are a large dependency, they re-implement CSS
 * imperfectly, and the strict CSP on this site makes their asset handling
 * awkward. Drawing directly is a few hundred lines, has no dependency, cannot
 * taint the canvas, and gives exact control over a graphic whose whole job is
 * to look deliberate in someone's feed.
 *
 * The exported card shows BOTH sides of the flash card — the word and what it
 * means — because a picture in a feed does not get to be turned over.
 */

export type ShareFormat = 'portrait' | 'square' | 'story'

export const FORMATS: Record<
  ShareFormat,
  { w: number; h: number; label: string; hint: string }
> = {
  portrait: { w: 1080, h: 1350, label: 'Post', hint: 'Instagram and Facebook feed' },
  square: { w: 1080, h: 1080, label: 'Square', hint: 'Any feed' },
  story: { w: 1080, h: 1920, label: 'Story', hint: 'Stories, Reels, Status' },
}

const C = {
  canvas: '#F5F7F6',
  ink: '#12181F',
  coral: '#E8613C',
  teal: '#1E7A70',
  tealTint: '#E3F1EF',
  gold: '#E3A733',
  goldTint: '#FBF1D9',
  white: '#FFFFFF',
  muted: '#6B7684',
}

/** The real font families, read from the page so the export matches the site. */
function families() {
  if (typeof window === 'undefined') {
    return { display: 'Georgia, serif', sans: 'system-ui, sans-serif' }
  }
  const s = getComputedStyle(document.documentElement)
  const display = s.getPropertyValue('--font-display').trim()
  const sans = s.getPropertyValue('--font-sans').trim()
  return {
    display: display ? `${display}, Georgia, serif` : 'Georgia, serif',
    sans: sans ? `${sans}, system-ui, sans-serif` : 'system-ui, sans-serif',
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Wrap text to a width, returning the lines. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width > maxW && line) {
      lines.push(line)
      line = w
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Largest size at which the word still fits the given width. */
function fitWord(
  ctx: CanvasRenderingContext2D,
  word: string,
  maxW: number,
  start: number,
  family: string
): number {
  let size = start
  while (size > 28) {
    ctx.font = `800 ${size}px ${family}`
    if (ctx.measureText(word).width <= maxW) break
    size -= 4
  }
  return size
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45
    const a = (Math.PI / 5) * i - Math.PI / 2
    const x = cx + Math.cos(a) * rad
    const y = cy + Math.sin(a) * rad
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}

export async function drawWordCard(
  canvas: HTMLCanvasElement,
  entry: WordEntry,
  dateLabel: string,
  format: ShareFormat
): Promise<void> {
  const { w, h } = FORMATS[format]
  canvas.width = w
  canvas.height = h

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is unavailable in this browser.')

  // Without this the first render falls back to a system font.
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready
    } catch {
      /* proceed with whatever is loaded */
    }
  }

  const f = families()
  const pad = Math.round(w * 0.075)
  const inner = w - pad * 2

  /* ---- ground ---- */
  ctx.fillStyle = C.canvas
  ctx.fillRect(0, 0, w, h)

  // Two soft blooms so the flat background is not dead space. Kept very low
  // contrast: the card is the subject.
  const bloom = (cx: number, cy: number, r: number, colour: string) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0, colour)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
  bloom(w * 0.85, h * 0.08, w * 0.55, 'rgba(232,97,60,0.10)')
  bloom(w * 0.1, h * 0.95, w * 0.6, 'rgba(30,122,112,0.09)')

  /* ---- wordmark ---- */
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = C.ink
  ctx.font = `800 ${Math.round(w * 0.032)}px ${f.display}`
  ctx.fillText('Spirit of Excellence', pad, pad + w * 0.03)
  ctx.fillStyle = C.muted
  ctx.font = `600 ${Math.round(w * 0.021)}px ${f.sans}`
  ctx.fillText('Tuition with Ms Betty', pad, pad + w * 0.062)

  ctx.textAlign = 'right'
  ctx.fillStyle = C.teal
  ctx.font = `700 ${Math.round(w * 0.022)}px ${f.sans}`
  ctx.fillText(dateLabel.toUpperCase(), w - pad, pad + w * 0.03)

  /* ---- the card ---- */
  const cardY = Math.round(h * (format === 'story' ? 0.16 : 0.13))
  const cardH = Math.round(h * (format === 'story' ? 0.34 : format === 'square' ? 0.38 : 0.36))
  const off = Math.round(w * 0.017) // hard offset, no blur

  ctx.fillStyle = C.ink
  roundRect(ctx, pad + off, cardY + off, inner, cardH, Math.round(w * 0.045))
  ctx.fill()

  ctx.fillStyle = C.coral
  roundRect(ctx, pad, cardY, inner, cardH, Math.round(w * 0.045))
  ctx.fill()
  ctx.lineWidth = Math.round(w * 0.006)
  ctx.strokeStyle = C.ink
  ctx.stroke()

  /* chip */
  const chipY = cardY + Math.round(cardH * 0.11)
  ctx.font = `800 ${Math.round(w * 0.021)}px ${f.sans}`
  const chipText = 'WORD OF THE DAY'
  const chipW = ctx.measureText(chipText).width + w * 0.055
  const chipH = Math.round(w * 0.058)
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  roundRect(ctx, pad + w * 0.05, chipY - chipH * 0.72, chipW, chipH, chipH / 2)
  ctx.fill()
  ctx.fillStyle = C.white
  ctx.textAlign = 'left'
  ctx.fillText(chipText, pad + w * 0.05 + w * 0.0275, chipY)

  /* the word */
  const wordMax = inner - w * 0.1
  const size = fitWord(ctx, entry.word, wordMax, Math.round(w * 0.16), f.display)
  ctx.font = `800 ${size}px ${f.display}`
  ctx.fillStyle = C.white
  ctx.textAlign = 'center'
  const wordY = cardY + cardH * 0.58
  ctx.fillText(entry.word, w / 2, wordY)

  /* sound chunks */
  const syllables = splitSyllables(entry)
  const chunkFont = Math.round(w * 0.028)
  ctx.font = `700 ${chunkFont}px ${f.display}`
  const gap = w * 0.012
  const padX = w * 0.018
  const widths = syllables.map((s) => ctx.measureText(s).width + padX * 2)
  const totalW = widths.reduce((a, b) => a + b, 0) + gap * (syllables.length - 1)
  let cx = w / 2 - totalW / 2
  const chunkY = wordY + w * 0.055
  const chunkH = chunkFont * 1.75
  syllables.forEach((s, i) => {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(18,24,31,0.22)'
    roundRect(ctx, cx, chunkY - chunkH * 0.72, widths[i], chunkH, chunkH * 0.32)
    ctx.fill()
    ctx.fillStyle = C.white
    ctx.textAlign = 'center'
    ctx.fillText(s, cx + widths[i] / 2, chunkY)
    cx += widths[i] + gap
  })

  /* part of speech */
  ctx.font = `italic 600 ${Math.round(w * 0.026)}px ${f.sans}`
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.textAlign = 'center'
  ctx.fillText(entry.partOfSpeech, w / 2, cardY + cardH * 0.88)

  /* ---- meaning ---- */
  let y = cardY + cardH + Math.round(h * 0.075)
  ctx.textAlign = 'left'

  ctx.fillStyle = C.teal
  ctx.font = `800 ${Math.round(w * 0.022)}px ${f.sans}`
  ctx.fillText('WHAT IT MEANS', pad, y)

  y += w * 0.05
  ctx.fillStyle = C.ink
  const defSize = Math.round(w * 0.045)
  ctx.font = `700 ${defSize}px ${f.display}`
  for (const line of wrap(ctx, entry.definition, inner)) {
    ctx.fillText(line, pad, y)
    y += defSize * 1.28
  }

  /* ---- example ---- */
  y += w * 0.04
  const exSize = Math.round(w * 0.032)
  ctx.font = `italic 500 ${exSize}px ${f.sans}`
  const exLines = wrap(ctx, `“${entry.example}”`, inner - w * 0.09)
  const boxH = exLines.length * exSize * 1.42 + w * 0.09

  ctx.fillStyle = C.goldTint
  roundRect(ctx, pad, y, inner, boxH, Math.round(w * 0.028))
  ctx.fill()

  ctx.fillStyle = '#B07C15'
  ctx.font = `800 ${Math.round(w * 0.019)}px ${f.sans}`
  ctx.fillText('TRY IT IN A SENTENCE', pad + w * 0.045, y + w * 0.045)

  ctx.fillStyle = C.ink
  ctx.font = `italic 500 ${exSize}px ${f.sans}`
  let ey = y + w * 0.045 + exSize * 1.5
  for (const line of exLines) {
    ctx.fillText(line, pad + w * 0.045, ey)
    ey += exSize * 1.42
  }

  /* ---- footer ---- */
  const footY = h - pad
  ctx.fillStyle = C.ink
  ctx.font = `800 ${Math.round(w * 0.03)}px ${f.display}`
  ctx.textAlign = 'left'
  ctx.fillText('soetuition.com', pad, footY)

  ctx.fillStyle = C.muted
  ctx.font = `500 ${Math.round(w * 0.021)}px ${f.sans}`
  ctx.fillText('A new word every day', pad, footY - w * 0.045)

  ctx.fillStyle = C.gold
  const sr = w * 0.018
  for (let i = 0; i < 5; i++) {
    star(ctx, w - pad - i * sr * 2.5 - sr, footY - sr * 0.6, sr)
  }
}

/** Render and hand back a PNG blob. */
export async function wordCardBlob(
  entry: WordEntry,
  dateLabel: string,
  format: ShareFormat
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  await drawWordCard(canvas, entry, dateLabel, format)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not create the image.'))),
      'image/png'
    )
  })
}

export function wordCardFilename(entry: WordEntry, day: string, format: ShareFormat) {
  return `word-of-the-day-${entry.word.toLowerCase()}-${day}-${format}.png`
}
