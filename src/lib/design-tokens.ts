// The Registry - Dark Luxe Design System

export const colors = {
  background: '#0A0A0A',
  surface: '#141414',
  surfaceHover: '#1A1A1A',
  border: '#2A2A2A',

  gold: {
    primary: '#C9A227',
    light: '#E8D48B',
    dark: '#9A7B1A',
    muted: 'rgba(201, 162, 39, 0.1)',
  },

  text: {
    primary: '#F5F5F0',
    secondary: '#A0A0A0',
    muted: '#666666',
  },

  status: {
    accept: '#2E7D32',
    reject: '#8B0000',
    pending: '#C9A227',
    deliberating: '#4A4A8A',
  },
} as const;

export const fonts = {
  heading: '"Playfair Display", serif',
  body: '"Inter", sans-serif',
  mono: '"JetBrains Mono", monospace',
} as const;

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
} as const;

export const typography = {
  hero: {
    fontSize: 'clamp(2.5rem, 8vw, 5rem)',
    fontWeight: 400,
    letterSpacing: '-0.02em',
    lineHeight: 1.1,
  },
  h1: {
    fontSize: '2.5rem',
    fontWeight: 400,
    letterSpacing: '-0.01em',
    lineHeight: 1.2,
  },
  h2: {
    fontSize: '1.75rem',
    fontWeight: 400,
    letterSpacing: '0',
    lineHeight: 1.3,
  },
  h3: {
    fontSize: '1.25rem',
    fontWeight: 500,
    letterSpacing: '0.01em',
    lineHeight: 1.4,
  },
  body: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.6,
  },
  small: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  caption: {
    fontSize: '0.75rem',
    fontWeight: 500,
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  },
} as const;

// Judge-specific colors for visual distinction
export const judgeColors = {
  VEIL: '#9B59B6',    // Purple - Mystic
  GATE: '#C9A227',    // Gold - Gatekeeper
  ECHO: '#3498DB',    // Blue - Listener
  CIPHER: '#1ABC9C',  // Teal - Analyst
  THREAD: '#E67E22',  // Orange - Connector
  MARGIN: '#E74C3C',  // Red - Outsider
  VOID: '#2C3E50',    // Dark slate - Silent
} as const;

export type JudgeName = keyof typeof judgeColors;
