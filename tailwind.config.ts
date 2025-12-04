import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
      '4xl': '2560px',
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        "background-light": "hsl(var(--background-light))",
        "background-dark": "hsl(var(--background-dark))",
        foreground: "hsl(var(--foreground))",
        "primary-text-light": "hsl(var(--primary-text-light))",
        "primary-text-dark": "hsl(var(--primary-text-dark))",
        "secondary-text-light": "hsl(var(--secondary-text-light))",
        "secondary-text-dark": "hsl(var(--secondary-text-dark))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        purple: {
          DEFAULT: "hsl(var(--purple))",
          foreground: "hsl(var(--purple-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "funil-vagas": {
          bg: "hsl(var(--funil-vagas-bg))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        sans: ["Manrope", "system-ui", "-apple-system", "sans-serif"],
        azo: ["Space Grotesk", "Manrope", "sans-serif"],
      },
      fontSize: {
        /* Static rem sizes */
        xs: ["0.75rem", { lineHeight: "1rem" }],       /* 12px */
        sm: ["0.875rem", { lineHeight: "1.25rem" }],   /* 14px */
        base: ["1rem", { lineHeight: "1.5rem" }],      /* 16px */
        lg: ["1.125rem", { lineHeight: "1.75rem" }],   /* 18px */
        xl: ["1.25rem", { lineHeight: "1.75rem" }],    /* 20px */
        "2xl": ["1.5rem", { lineHeight: "2rem" }],     /* 24px */
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }], /* 30px */
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],  /* 36px */
        "5xl": ["3rem", { lineHeight: "1" }],          /* 48px */
        "6xl": ["3.75rem", { lineHeight: "1" }],       /* 60px */
        
        /* Responsive headings with clamp() */
        "h1": ["clamp(2rem, 5vw, 3rem)", { lineHeight: "1.2", fontWeight: "700" }],
        "h2": ["clamp(1.75rem, 4vw, 2.25rem)", { lineHeight: "1.3", fontWeight: "700" }],
        "h3": ["clamp(1.5rem, 3vw, 1.875rem)", { lineHeight: "1.4", fontWeight: "600" }],
        "h4": ["clamp(1.25rem, 2.5vw, 1.5rem)", { lineHeight: "1.4", fontWeight: "600" }],
        "h5": ["clamp(1.125rem, 2vw, 1.25rem)", { lineHeight: "1.5", fontWeight: "600" }],
        "h6": ["clamp(1rem, 1.5vw, 1.125rem)", { lineHeight: "1.5", fontWeight: "600" }],
      },
      spacing: {
        xs: "0.25rem",   /* 4px */
        sm: "0.5rem",    /* 8px */
        md: "1rem",      /* 16px */
        lg: "1.5rem",    /* 24px */
        xl: "2rem",      /* 32px */
        "2xl": "3rem",   /* 48px */
        "3xl": "4rem",   /* 64px */
      },
      borderRadius: {
        DEFAULT: "0.5rem",   /* 8px */
        sm: "0.5rem",        /* 8px */
        md: "0.75rem",       /* 12px */
        lg: "0.75rem",       /* 12px */
        xl: "1rem",          /* 16px */
        "2xl": "1.25rem",    /* 20px */
        full: "9999px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
