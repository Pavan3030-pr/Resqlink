/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces: a cool, flat canvas with white panels. Depth comes from the elevation scale below, not from tints.
        background: '#E9EDF3',
        surface: { DEFAULT: '#FFFFFF', 2: '#F5F7FA', 3: '#ECEFF4' },
        // Dark operations rail (navigation chrome). `sidebar` is kept as an alias for older call sites.
        rail: { DEFAULT: '#0E1828', 2: '#17253B', line: '#24364F', text: '#A7B4C9', ink: '#F1F5FA' },
        sidebar: '#0E1828',
        // Human-decided actions and selection.
        primary: { DEFAULT: '#1E4FD6', hover: '#173FB0', soft: '#EAF0FE', edge: '#B8CAF6' },
        // Machine-suggested content. Anything coloured violet came from the AI and is advisory.
        advisory: { DEFAULT: '#5B3FB8', tint: '#F3F0FC', edge: '#CFC4F0' },
        ink: { DEFAULT: '#0B1626', 2: '#243247' },
        muted: '#4F5D75', // >= 5.6:1 on canvas and on every surface
        line: { DEFAULT: '#D6DDE7', strong: '#B9C4D3' },
        // Priority signals. DEFAULT is the AA-safe text shade; `solid` is for fills, bars and markers.
        critical: { DEFAULT: '#B42318', solid: '#D92D20', tint: '#FEF3F2', edge: '#FDA29B', deep: '#7A1A12' },
        high: { DEFAULT: '#B54708', solid: '#E8590C', tint: '#FFF4ED', edge: '#F7B27E' },
        medium: { DEFAULT: '#7A4A06', solid: '#C27C05', tint: '#FFFAEB', edge: '#F2D28B' },
        low: { DEFAULT: '#15693A', solid: '#1B9A52', tint: '#EDF8F1', edge: '#A3D9B9' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Inter', '"Noto Sans Devanagari"', '"Noto Sans Telugu"', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        // Counts, timers and incident numbers: condensed, tabular and heavier so they scan first.
        figure: ['"IBM Plex Sans Condensed"', '"IBM Plex Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: { '2xs': ['0.6875rem', { lineHeight: '1rem' }] },
      borderRadius: { ctl: '8px', panel: '10px' },
      boxShadow: {
        // Four elevation levels: canvas (none) < panel < raised < hero, plus overlay for menus and dialogs.
        card: '0 0 0 1px rgba(11,22,38,0.03), 0 1px 2px rgba(11,22,38,0.06)',
        raised: '0 1px 2px rgba(11,22,38,0.06), 0 6px 14px -4px rgba(11,22,38,0.12)',
        hero: '0 2px 4px rgba(11,22,38,0.06), 0 16px 32px -8px rgba(11,22,38,0.20)',
        overlay: '0 16px 48px -8px rgba(11,22,38,0.32), 0 2px 6px rgba(11,22,38,0.10)',
        lift: '0 8px 24px rgba(11,22,38,0.10)',
      },
    },
  },
  plugins: [],
}
