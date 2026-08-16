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
      colors: {
        ink: {
          DEFAULT: '#12181F',
          soft: '#39434F',
          muted: '#6B7684',
        },
        canvas: '#F5F7F6',
        surface: {
          DEFAULT: '#FFFFFF',
          soft: '#FBFCFC',
          sunk: '#EFF3F1',
        },
        line: {
          DEFAULT: '#E5EAE8',
          soft: '#EEF2F0',
        },
        coral: {
          DEFAULT: '#E8613C',
          deep: '#C4441F',
          soft: '#F6906F',
          tint: '#FDEDE6',
        },
        teal: {
          DEFAULT: '#1E7A70',
          deep: '#12554E',
          soft: '#4FA79C',
          tint: '#E3F1EF',
        },
        gold: {
          DEFAULT: '#E3A733',
          deep: '#B07C15',
          tint: '#FBF1D9',
        },
        tile: {
          rose: '#FDEBE5',
          sky: '#E6F1FC',
          amber: '#FCF2DE',
          violet: '#F0EBFA',
          mint: '#E3F4EB',
          peach: '#FCEEE4',
        },
        success: '#15855C',
        'success-tint': '#E3F4EB',
        warn: '#C97A08',
        'warn-tint': '#FBF1DC',
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
