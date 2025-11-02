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
        'parsing-purple': '#a855f7',
        'cost-orange': '#f97316',
        'metric-gray': '#9aa2b4',

        // Dark neutrals inspired by observability consoles
        background: '#12121b',
        'background-soft': '#171823',
        surface: '#1b1f2b',
        'surface-soft': '#202536',
        border: '#2b3142',
        'border-strong': '#3a4157',
        'text-primary': '#f3f4f6',
        'text-secondary': '#9ca3b5',
        'primary-foreground': '#f5f3ff',
        'secondary-foreground': '#fff7ed',
        'success-foreground': '#012216',
        'warning-foreground': '#251600',
        'danger-foreground': '#1f0003'
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
          background: '#12121b',
          foreground: '#f3f4f6',
          focus: '#a855f7',
          primary: {
            DEFAULT: '#7c6cff',
            foreground: '#f5f3ff'
          },
          secondary: {
            DEFAULT: '#f97316',
            foreground: '#fff7ed'
          },
          success: {
            DEFAULT: '#10b981',
            foreground: '#012216'
          },
          warning: {
            DEFAULT: '#fbbf24',
            foreground: '#251600'
          },
          danger: {
            DEFAULT: '#ef4444',
            foreground: '#1f0003'
          },
          divider: '#272d3d',
          border: '#2b3142'
        }
      }
    }
  })]
}
