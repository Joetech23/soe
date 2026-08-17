import type { Config } from 'tailwindcss'

/**
 * Spirit of Excellence Tuition — design system v2.
 *
 * Premium editorial-SaaS surface: generous rhythm, soft layered shadows,
 * tinted icon tiles, two-tone headings. Ms Betty's coral + teal brand is
 * unchanged; everything around it got quieter so the brand reads louder.
 */
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      /**
       * Every colour that changes between light and dark is a CSS variable
       * holding space-separated RGB channels, so `<alpha-value>` keeps working
       * and `bg-surface/60` still means what it says.
       *
       * The point of doing it this way: dark mode is a second set of variable
       * values in globals.css, not a `dark:` class on several hundred elements.
       * Nothing in the components had to change.
       *
       * Brand hues that must stay recognisable — coral, teal and gold at full
       * strength — remain literal. Only their tints and "deep" variants flip,
       * because those are backgrounds and text-on-tint respectively.
       */
      colors: {
        ink: {
          DEFAULT: 'rgb(var(--c-ink) / <alpha-value>)',
          soft: 'rgb(var(--c-ink-soft) / <alpha-value>)',
          muted: 'rgb(var(--c-ink-muted) / <alpha-value>)',
        },
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--c-surface) / <alpha-value>)',
          soft: 'rgb(var(--c-surface-soft) / <alpha-value>)',
          sunk: 'rgb(var(--c-surface-sunk) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--c-line) / <alpha-value>)',
          soft: 'rgb(var(--c-line-soft) / <alpha-value>)',
        },
        coral: {
          DEFAULT: '#E8613C',
          soft: '#F6906F',
          deep: 'rgb(var(--c-coral-deep) / <alpha-value>)',
          tint: 'rgb(var(--c-coral-tint) / <alpha-value>)',
        },
        teal: {
          DEFAULT: '#1E7A70',
          soft: '#4FA79C',
          deep: 'rgb(var(--c-teal-deep) / <alpha-value>)',
          tint: 'rgb(var(--c-teal-tint) / <alpha-value>)',
        },
        gold: {
          DEFAULT: '#E3A733',
          deep: 'rgb(var(--c-gold-deep) / <alpha-value>)',
          tint: 'rgb(var(--c-gold-tint) / <alpha-value>)',
        },
        tile: {
          rose: 'rgb(var(--c-tile-rose) / <alpha-value>)',
          sky: 'rgb(var(--c-tile-sky) / <alpha-value>)',
          amber: 'rgb(var(--c-tile-amber) / <alpha-value>)',
          violet: 'rgb(var(--c-tile-violet) / <alpha-value>)',
          mint: 'rgb(var(--c-tile-mint) / <alpha-value>)',
          peach: 'rgb(var(--c-tile-peach) / <alpha-value>)',
        },
        success: 'rgb(var(--c-success) / <alpha-value>)',
        'success-tint': 'rgb(var(--c-success-tint) / <alpha-value>)',
        warn: 'rgb(var(--c-warn) / <alpha-value>)',
        'warn-tint': 'rgb(var(--c-warn-tint) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        eyebrow: ['0.72rem', { lineHeight: '1', letterSpacing: '0.14em' }],
      },
      letterSpacing: {
        tightest: '-0.045em',
      },
      maxWidth: {
        measure: '65ch',
        shell: '80rem',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(18, 24, 31, 0.05)',
        card: '0 1px 2px rgba(18,24,31,0.04), 0 4px 12px -4px rgba(18,24,31,0.06)',
        lift: '0 18px 40px -18px rgba(18,24,31,0.22)',
        pop: '0 28px 60px -20px rgba(18,24,31,0.28)',
        glow: '0 0 0 1px rgba(232,97,60,0.12), 0 18px 44px -18px rgba(232,97,60,0.45)',
        focus: '0 0 0 4px rgba(232, 97, 60, 0.2)',
      },
      borderRadius: {
        card: '1.25rem',
        xl2: '1.75rem',
        pill: '999px',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.4, 0.5, 1)',
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'marquee-rev': {
          from: { transform: 'translateX(-50%)' },
          to: { transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-16px) rotate(3deg)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.25', transform: 'scale(0.85) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1.1) rotate(90deg)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'blur-in': {
          '0%': { opacity: '0', filter: 'blur(10px)', transform: 'translateY(18px)' },
          '100%': { opacity: '1', filter: 'blur(0)', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.6' },
          '70%': { transform: 'scale(1.35)', opacity: '0' },
          '100%': { transform: 'scale(1.35)', opacity: '0' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'draw-underline': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
      },
      animation: {
        marquee: 'marquee 32s linear infinite',
        'marquee-slow': 'marquee 60s linear infinite',
        'marquee-rev': 'marquee-rev 44s linear infinite',
        float: 'float 5s ease-in-out infinite',
        'float-slow': 'float-slow 8s ease-in-out infinite',
        twinkle: 'twinkle 4s ease-in-out infinite',
        'spin-slow': 'spin-slow 18s linear infinite',
        'blur-in': 'blur-in 0.8s cubic-bezier(0.22,1,0.36,1) both',
        'scale-in': 'scale-in 0.4s ease both',
        'pulse-ring': 'pulse-ring 2.6s cubic-bezier(0.4,0,0.6,1) infinite',
        'gradient-pan': 'gradient-pan 8s ease infinite',
      },
    },
  },
  plugins: [],
}

export default config
