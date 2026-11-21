/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces: a cool, flat canvas with white panels. Depth comes from the elevation scale below, not from tints.
        background: '#F3F5F8',
        surface: { DEFAULT: '#FFFFFF', 2: '#F8F9FB', 3: '#EEF1F5' },
        // Dark operations rail (navigation chrome). `sidebar` is kept as an alias for older call sites.
        rail: { DEFAULT: '#FFFFFF', 2: '#EEF1F5', line: '#E3E8EF', text: '#566275', ink: '#0F1B2D' },
        sidebar: '#FFFFFF',
        // Human-decided actions and selection.
        primary: { DEFAULT: '#0B5D5E', hover: '#084849', soft: '#E4F2F2', edge: '#A6D1D1' },
        // Machine-suggested content. Anything coloured violet came from the AI and is advisory.
        advisory: { DEFAULT: '#5B3FB8', tint: '#F3F0FC', edge: '#CFC4F0' },
        ink: { DEFAULT: '#0F1B2D', 2: '#2A3850' },
        muted: '#566275', // >= 5.6:1 on canvas and on every surface
        line: { DEFAULT: '#E3E8EF', strong: '#C9D2DE' },
        // Priority signals. DEFAULT is the AA-safe text shade; `solid` is for fills, bars and markers.
        critical: { DEFAULT: '#B42318', solid: '#D92D20', tint: '#FEF3F2', edge: '#FDA29B', deep: '#7A1A12' },
        high: { DEFAULT: '#B54708', solid: '#E8590C', tint: '#FFF4ED', edge: '#F7B27E' },
        medium: { DEFAULT: '#7A4A06', solid: '#C27C05', tint: '#FFFAEB', edge: '#F2D28B' },
        low: { DEFAULT: '#15693A', solid: '#1B9A52', tint: '#EDF8F1', edge: '#A3D9B9' },
      },
      fontFamily: {
        sans: ['"Public Sans"', 'Inter', '"Noto Sans Devanagari"', '"Noto Sans Telugu"', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['"Bricolage Grotesque"', '"Public Sans"', '"Noto Sans Devanagari"', '"Noto Sans Telugu"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Counts, timers and incident numbers: condensed, tabular and heavier so they scan first.
        figure: ['"Public Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: { '2xs': ['0.6875rem', { lineHeight: '1rem' }] },
      borderRadius: { ctl: '10px', panel: '14px' },
      boxShadow: {
        // Four elevation levels: canvas (none) < panel < raised < hero, plus overlay for menus and dialogs.
        card: '0 1px 2px rgba(15,27,45,0.04)',
        raised: '0 1px 2px rgba(15,27,45,0.05), 0 8px 20px -10px rgba(15,27,45,0.14)',
        hero: '0 1px 2px rgba(15,27,45,0.05), 0 24px 48px -20px rgba(15,27,45,0.22)',
        overlay: '0 20px 56px -12px rgba(15,27,45,0.30), 0 2px 6px rgba(15,27,45,0.08)',
        lift: '0 10px 28px -12px rgba(15,27,45,0.18)',
      },
    },
  },
  plugins: [],
}
