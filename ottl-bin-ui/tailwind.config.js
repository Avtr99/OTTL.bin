import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors for transformation categories
        'parsing-purple': '#c084fc',
        'cost-orange': '#fb923c',
        'metric-gray': '#a1a1aa',

        // High-contrast dark theme with warmer tones
        background: '#0a0a0f',
        'background-soft': '#111118',
        surface: '#18181f',
        'surface-soft': '#1f1f28',
        border: '#2d2d3a',
        'border-strong': '#3f3f4f',
        'text-primary': '#fafafa',
        'text-secondary': '#a1a1aa',
        'primary-foreground': '#fafafa',
        'secondary-foreground': '#fafafa',
        'success-foreground': '#fafafa',
        'warning-foreground': '#18181b',
        'danger-foreground': '#fafafa'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      fontSize: {
        'body': '0.875rem',     // 14px / 400 weight
        'small': '0.75rem',     // 12px / 400 weight
        'code': '0.8125rem',    // 13px / 400 weight
        'h3': '1rem',           // 16px / 600 weight
        'h2': '1.25rem',        // 20px / 600 weight
        'h1': '1.5rem'          // 24px / 600 weight
      },
      spacing: {
        'unit': '4px'
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.1)',
        'card-hover': '0 4px 6px rgba(0,0,0,0.1)'
      },
      transitionDuration: {
        'card': '200ms',
        'drag': '150ms',
        'button': '100ms'
      }
    }
  },
  darkMode: "class",
  plugins: [heroui({
    defaultTheme: 'dark',
    themes: {
      dark: {
        layout: {
          hoverEffect: 'opacity'
        },
        colors: {
          background: '#0a0a0f',
          foreground: '#fafafa',
          focus: '#8b5cf6',
          primary: {
            DEFAULT: '#8b5cf6',
            foreground: '#fafafa'
          },
          secondary: {
            DEFAULT: '#06b6d4',
            foreground: '#fafafa'
          },
          success: {
            DEFAULT: '#22c55e',
            foreground: '#fafafa'
          },
          warning: {
            DEFAULT: '#f59e0b',
            foreground: '#18181b'
          },
          danger: {
            DEFAULT: '#ef4444',
            foreground: '#fafafa'
          },
          divider: '#27272a',
          border: '#2d2d3a'
        }
      }
    }
  })]
}
