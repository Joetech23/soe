'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Download, Share2, Link2, Check, Loader2, ImageIcon } from 'lucide-react'
import {
  drawWordCard,
  wordCardBlob,
  wordCardFilename,
  FORMATS,
  type ShareFormat,
} from '@/lib/word-card-image'
import type { WordEntry } from '@/lib/word-of-the-day'

/**
 * Save the picture, or share it.
 *
 * The preview is the real export: the same draw call, on a canvas scaled down
 * by CSS. So what a parent sees is exactly the file they get — no "close
 * enough" second implementation to drift out of step.
 *
 * Sharing prefers the Web Share API with the actual image attached, which is
 * the only route that puts a picture into Instagram or WhatsApp from a phone
 * in one tap. Everything else falls back to saving the file, which always
 * works.
 */
export function ShareTools({
  entry,
  day,
  dateLabel,
  shareUrl,
}: {
  entry: WordEntry
  day: string
  dateLabel: string
  shareUrl: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [format, setFormat] = useState<ShareFormat>('portrait')
  const [drawing, setDrawing] = useState(true)
  const [busy, setBusy] = useState<'download' | 'share' | null>(null)
  const [copied, setCopied] = useState(false)
  const [canShareFiles, setCanShareFiles] = useState(false)

  useEffect(() => {
    // Feature-detect with a real file: some browsers expose share() but refuse
    // file payloads, and finding that out mid-tap is a poor way to learn it.
    try {
      const probe = new File(['probe'], 'probe.png', { type: 'image/png' })
      setCanShareFiles(
        typeof navigator !== 'undefined' &&
          typeof navigator.canShare === 'function' &&
          navigator.canShare({ files: [probe] })
      )
    } catch {
      setCanShareFiles(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return
    drawWordCard(canvas, entry, dateLabel, format)
      .catch(() => {
        if (!cancelled) toast.error('Could not draw the picture in this browser.')
      })
      .finally(() => {
        if (!cancelled) setDrawing(false)
      })
    return () => {
      cancelled = true
    }
  }, [entry, dateLabel, format])

  async function download() {
    setBusy('download')
    try {
      const blob = await wordCardBlob(entry, dateLabel, format)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = wordCardFilename(entry, day, format)
      document.body.appendChild(a)
      a.click()
      a.remove()
      // Revoke on the next tick so the download has taken the reference.
      setTimeout(() => URL.revokeObjectURL(url), 2000)
      toast.success('Saved to your downloads.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the picture.')
    } finally {
      setBusy(null)
    }
  }

  async function share() {
    setBusy('share')
    try {
      const blob = await wordCardBlob(entry, dateLabel, format)
      const file = new File([blob], wordCardFilename(entry, day, format), {
        type: 'image/png',
      })
      const payload = {
        files: [file],
        title: `Word of the day: ${entry.word}`,
        text: `${entry.word} — ${entry.definition}`,
      }
      if (navigator.canShare?.(payload)) {
        await navigator.share(payload)
      } else {
        await navigator.share({
          title: `Word of the day: ${entry.word}`,
          text: `${entry.word} — ${entry.definition}`,
          url: shareUrl,
        })
      }
    } catch (err) {
      // A cancelled share is not a failure.
      if ((err as Error)?.name !== 'AbortError') {
        toast.error('Could not open sharing. Save the picture instead.')
      }
    } finally {
      setBusy(null)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success('Link copied.')
      setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error('Could not copy. Select the address bar instead.')
    }
  }

  const text = encodeURIComponent(
    `Word of the day: ${entry.word} — ${entry.definition}`
  )
  const enc = encodeURIComponent(shareUrl)

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center">
      {/* Preview — the actual export, scaled */}
      <div className="mx-auto w-full max-w-[19rem]">
        <div className="relative overflow-hidden rounded-2xl border-2 border-ink bg-canvas shadow-[8px_8px_0_0_theme(colors.ink.DEFAULT)]">
          <canvas
            ref={canvasRef}
            className="block h-auto w-full"
            aria-label={`Shareable picture for the word ${entry.word}`}
          />
          {drawing && (
            <div className="absolute inset-0 grid place-items-center bg-canvas/80">
              <Loader2 className="h-5 w-5 animate-spin text-teal" aria-hidden />
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          Put it on the fridge.
        </h2>
        <p className="mt-2 max-w-md text-ink-soft">
          Save today&rsquo;s word as a picture, or send it straight to a friend.
          Pick the shape that fits where it&rsquo;s going.
        </p>

        <fieldset className="mt-6">
          <legend className="eyebrow mb-2">Shape</legend>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(FORMATS) as ShareFormat[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFormat(k)}
                aria-pressed={format === k}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-pill border-2 px-4 text-sm font-bold transition-colors ${
                  format === k
                    ? 'border-ink bg-ink text-white'
                    : 'border-line bg-surface text-ink hover:border-ink'
                }`}
              >
                <ImageIcon className="h-3.5 w-3.5" aria-hidden />
                {FORMATS[k].label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-muted">{FORMATS[format].hint}</p>
        </fieldset>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={download}
            disabled={busy !== null}
            className="wotd-action"
          >
            {busy === 'download' ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4" aria-hidden />
            )}
            Save the picture
          </button>

          {canShareFiles && (
            <button
              type="button"
              onClick={share}
              disabled={busy !== null}
              className="wotd-action"
            >
              {busy === 'share' ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Share2 className="h-4 w-4" aria-hidden />
              )}
              Share
            </button>
          )}

          <button type="button" onClick={copyLink} className="wotd-action">
            {copied ? (
              <Check className="h-4 w-4" aria-hidden />
            ) : (
              <Link2 className="h-4 w-4" aria-hidden />
            )}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="text-ink-muted">Or post it to</span>
          {[
            { label: 'WhatsApp', href: `https://wa.me/?text=${text}%20${enc}` },
            {
              label: 'Facebook',
              href: `https://www.facebook.com/sharer/sharer.php?u=${enc}`,
            },
            { label: 'X', href: `https://twitter.com/intent/tweet?text=${text}&url=${enc}` },
          ].map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-teal underline-offset-4 hover:text-coral hover:underline"
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
