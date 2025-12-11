# Design System rhello flow

> Documentação completa do design system para uso em projetos Lovable

---

## 📋 Índice

1. [Identidade Visual](#identidade-visual)
2. [Componentes UI](#componentes-ui)
3. [Utilitários CSS](#utilitários-css)
4. [Padrões de Layout](#padrões-de-layout)
5. [Regras de Estilo](#regras-de-estilo)
6. [Configuração Técnica](#configuração-técnica)
7. [Instruções de Uso](#instruções-de-uso)

---

## Identidade Visual

### Paleta de Cores (HSL)

#### Cores Primárias
```css
--primary: 48 100% 50%          /* #FFCD00 - Amarelo Principal */
--primary-foreground: 195 100% 6%  /* #00141D - Texto sobre amarelo */
--accent: 56 95% 61%            /* #FAEC3E - Amarelo Secundário */
--accent-foreground: 195 100% 6%
```

#### Backgrounds
```css
/* Light Mode */
--background: 45 100% 99%       /* #FFFDF6 - Fundo claro creme */
--background-light: 45 100% 99%

/* Dark Mode */
--background: 195 100% 6%       /* #00141D - Azul escuro */
--background-dark: 195 100% 6%
```

#### Texto
```css
/* Light Mode */
--foreground: 195 100% 6%       /* #00141D */
--text-dark: 195 100% 6%

/* Dark Mode */
--foreground: 45 100% 99%       /* #FFFDF6 */
--text-light: 45 100% 99%
```

#### Cores Semânticas
```css
--success: 142 76% 36%          /* Verde */
--success-foreground: 0 0% 100%
--warning: 38 92% 50%           /* Laranja */
--warning-foreground: 0 0% 100%
--destructive: 0 84% 60%        /* Vermelho */
--destructive-foreground: 0 0% 100%
--info: 199 89% 48%             /* Azul info */
--info-foreground: 0 0% 100%
--purple: 262 83% 58%           /* Roxo */
--purple-foreground: 0 0% 100%
```

#### Cores de Componentes
```css
--card: 0 0% 100%
--card-foreground: 195 100% 6%
--popover: 0 0% 100%
--popover-foreground: 195 100% 6%
--secondary: 210 40% 96%
--secondary-foreground: 195 100% 6%
--muted: 210 40% 96%
--muted-foreground: 215 16% 47%
--border: 214 32% 91%
--input: 214 32% 91%
--ring: 48 100% 50%
```

#### Sidebar
```css
--sidebar-background: 195 100% 6%    /* #00141D */
--sidebar-foreground: 45 100% 99%    /* #FFFDF6 */
--sidebar-primary: 48 100% 50%       /* #FFCD00 */
--sidebar-primary-foreground: 195 100% 6%
--sidebar-accent: 56 95% 61%         /* #FAEC3E */
--sidebar-accent-foreground: 195 100% 6%
--sidebar-border: 210 40% 20%
--sidebar-ring: 48 100% 50%
```

---

### Tipografia

#### Fontes (Google Fonts)
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

#### Configuração Tailwind
```typescript
fontFamily: {
  display: ['Space Grotesk', 'system-ui', 'sans-serif'],
  sans: ['Manrope', 'system-ui', 'sans-serif'],
  azo: ['Azo Sans', 'system-ui', 'sans-serif'],
}
```

#### Escala Tipográfica
```css
/* Tamanhos Estáticos */
--font-size-xs: 0.75rem;    /* 12px */
--font-size-sm: 0.875rem;   /* 14px */
--font-size-base: 1rem;     /* 16px */
--font-size-lg: 1.125rem;   /* 18px */
--font-size-xl: 1.25rem;    /* 20px */
--font-size-2xl: 1.5rem;    /* 24px */
--font-size-3xl: 1.875rem;  /* 30px */

/* Headings Responsivos (clamp) */
--font-size-h1: clamp(1.75rem, 4vw, 2.5rem);
--font-size-h2: clamp(1.5rem, 3vw, 2rem);
--font-size-h3: clamp(1.25rem, 2.5vw, 1.75rem);
--font-size-h4: clamp(1.125rem, 2vw, 1.5rem);
```

---

### Espaçamento

```css
--spacing-xs: 0.25rem;   /* 4px */
--spacing-sm: 0.5rem;    /* 8px */
--spacing-md: 1rem;      /* 16px */
--spacing-lg: 1.5rem;    /* 24px */
--spacing-xl: 2rem;      /* 32px */
--spacing-2xl: 3rem;     /* 48px */
--spacing-3xl: 4rem;     /* 64px */
```

---

### Border Radius

```css
--radius-sm: 0.25rem;    /* 4px */
--radius-md: 0.375rem;   /* 6px */
--radius-lg: 0.5rem;     /* 8px */
--radius-xl: 0.75rem;    /* 12px */
--radius-2xl: 1rem;      /* 16px */
--radius-full: 9999px;
```

---

### Breakpoints

```typescript
screens: {
  'xs': '375px',
  'sm': '640px',
  'md': '768px',
  'lg': '1024px',
  'xl': '1280px',
  '2xl': '1536px',
  '3xl': '1920px',
  '4xl': '2560px',
}
```

---

## Componentes UI

### Botões

#### Variantes
```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        dark: "bg-[#00141D] text-white hover:bg-[#00141D]/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
  }
)
```

#### Classes Touch-Friendly
```css
min-h-[44px] min-w-[44px]  /* Área de toque mínima */
```

---

### Cards

#### Padrão
```tsx
<Card className="rounded-lg border border-gray-300 bg-card shadow-md">
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>
```

#### Classes Base
```css
rounded-lg border bg-card text-card-foreground shadow-sm
border-gray-300 shadow-md  /* Padrão rhello */
```

---

### Badges

#### Variantes
```typescript
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-success text-success-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
        info: "border-transparent bg-info text-info-foreground",
      },
    },
  }
)
```

---

## Utilitários CSS

### Animações

```css
/* Hover Lift */
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Card Shadow */
.card-shadow {
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
}
.card-shadow:hover {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}
```

### Keyframes Tailwind

```typescript
keyframes: {
  'accordion-down': {
    from: { height: '0' },
    to: { height: 'var(--radix-accordion-content-height)' },
  },
  'accordion-up': {
    from: { height: 'var(--radix-accordion-content-height)' },
    to: { height: '0' },
  },
  shimmer: {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },
  'pulse-glow': {
    '0%, 100%': { boxShadow: '0 0 5px rgba(255, 205, 0, 0.5)' },
    '50%': { boxShadow: '0 0 20px rgba(255, 205, 0, 0.8)' },
  },
}
```

### Acessibilidade

```css
/* Safe Areas (Mobile) */
.pt-safe { padding-top: env(safe-area-inset-top); }
.pb-safe { padding-bottom: env(safe-area-inset-bottom); }
.pl-safe { padding-left: env(safe-area-inset-left); }
.pr-safe { padding-right: env(safe-area-inset-right); }

/* Touch Target */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Padrões de Layout

### Estrutura 2 Colunas (Páginas de Gestão)

```tsx
<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
  {/* Conteúdo Principal - 75% */}
  <div className="lg:col-span-3">
    {/* Tabs, Filtros, Conteúdo */}
  </div>
  
  {/* Sidebar Dashboard - 25% */}
  <div className="lg:col-span-1 sticky top-24">
    {/* Métricas, Alertas */}
  </div>
</div>
```

### Variações de Proporção

```tsx
/* 80/20 - Candidatos */
lg:grid-cols-5 → lg:col-span-4 + lg:col-span-1

/* 75/25 - Vagas, Clientes */
lg:grid-cols-4 → lg:col-span-3 + lg:col-span-1

/* 70/30 - Tarefas */
lg:grid-cols-3 → lg:col-span-2 + lg:col-span-1
```

### Container Responsivo

```css
/* Full width em todas as telas */
.w-full

/* Padding responsivo */
.px-4 md:px-6 lg:px-8

/* Max-width apenas quando necessário */
.max-w-screen-2xl mx-auto
```

---

## Regras de Estilo

### Guidelines Visuais

1. **Sem emojis** em toda a interface
2. **Hierarquia visual** com negrito e tamanhos diferentes
3. **Espaço em branco generoso** entre seções
4. **Bordas cinzas** (`border-gray-300`) em cards
5. **Sombras leves** (`shadow-md`) para elevação
6. **Botões primários** em `bg-[#00141D]` (preto rhello)

### Convenções de Código

```tsx
// ✅ CORRETO - Usar tokens semânticos
<div className="bg-background text-foreground border-border">

// ❌ ERRADO - Cores diretas
<div className="bg-white text-black border-gray-200">

// ✅ CORRETO - Variantes de componentes
<Button variant="dark">Ação</Button>

// ❌ ERRADO - Classes inline
<Button className="bg-[#00141D] text-white">Ação</Button>
```

### Padrões de Cards

```tsx
// Dashboard Sidebar Card
<Card className="border-gray-300 shadow-md">
  <CardContent className="p-4">
    <h3 className="text-sm font-medium text-muted-foreground">Label</h3>
    <p className="text-2xl font-bold">Valor</p>
  </CardContent>
</Card>

// Info Card
<Card className="border-gray-300 shadow-md bg-white">
  <CardHeader className="pb-2">
    <CardTitle className="text-base font-semibold">Título</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Conteúdo */}
  </CardContent>
</Card>
```

---

## Configuração Técnica

### Variáveis CSS Completas (index.css)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Brand Colors */
    --primary: 48 100% 50%;
    --primary-foreground: 195 100% 6%;
    --accent: 56 95% 61%;
    --accent-foreground: 195 100% 6%;
    
    /* Background */
    --background: 45 100% 99%;
    --background-light: 45 100% 99%;
    --background-dark: 195 100% 6%;
    
    /* Text */
    --foreground: 195 100% 6%;
    --text-dark: 195 100% 6%;
    --text-light: 45 100% 99%;
    
    /* Semantic */
    --success: 142 76% 36%;
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 50%;
    --warning-foreground: 0 0% 100%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --info: 199 89% 48%;
    --info-foreground: 0 0% 100%;
    --purple: 262 83% 58%;
    --purple-foreground: 0 0% 100%;
    
    /* Components */
    --card: 0 0% 100%;
    --card-foreground: 195 100% 6%;
    --popover: 0 0% 100%;
    --popover-foreground: 195 100% 6%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 195 100% 6%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 48 100% 50%;
    
    /* Radius */
    --radius: 0.5rem;
    
    /* Sidebar */
    --sidebar-background: 195 100% 6%;
    --sidebar-foreground: 45 100% 99%;
    --sidebar-primary: 48 100% 50%;
    --sidebar-primary-foreground: 195 100% 6%;
    --sidebar-accent: 56 95% 61%;
    --sidebar-accent-foreground: 195 100% 6%;
    --sidebar-border: 210 40% 20%;
    --sidebar-ring: 48 100% 50%;
  }

  .dark {
    --background: 195 100% 6%;
    --foreground: 45 100% 99%;
    --card: 200 50% 10%;
    --card-foreground: 45 100% 99%;
    --popover: 200 50% 10%;
    --popover-foreground: 45 100% 99%;
    --muted: 200 30% 15%;
    --muted-foreground: 210 20% 70%;
    --border: 210 30% 20%;
    --input: 210 30% 20%;
  }
}

/* Utilities */
@layer utilities {
  .hover-lift {
    @apply transition-transform duration-200 ease-out;
  }
  .hover-lift:hover {
    @apply -translate-y-0.5;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .card-shadow {
    @apply shadow-sm transition-shadow duration-200;
  }
  .card-shadow:hover {
    @apply shadow-md;
  }
}
```

### Fontes (index.html)

```html
<head>
  <!-- Preconnect -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  
  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
```

### Tailwind Config (tailwind.config.ts)

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
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
        foreground: "hsl(var(--foreground))",
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
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
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
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

---

## Instruções de Uso

### Em Novo Projeto Lovable

1. **Copie as variáveis CSS** para `src/index.css`
2. **Adicione os links de fontes** no `index.html`
3. **Configure o `tailwind.config.ts`** com as extensões
4. **Use os tokens semânticos** em vez de cores diretas

### Referência Rápida

```tsx
// Cores
bg-primary           // Amarelo #FFCD00
bg-background        // Fundo claro #FFFDF6
text-foreground      // Texto escuro #00141D
bg-sidebar           // Sidebar #00141D

// Cards
border-gray-300 shadow-md

// Botões
<Button variant="dark">   // Preto rhello
<Button variant="default"> // Amarelo primary

// Layout 2 colunas
grid lg:grid-cols-4 → lg:col-span-3 + lg:col-span-1
```

### Prompt para IA

> "Seguir o design system rhello: fundo #FFFDF6, amarelo primário #FFCD00, texto #00141D, fontes Manrope/Space Grotesk, cards com border-gray-300 shadow-md, botões primários em preto #00141D, layout 2 colunas com sidebar de métricas, sem emojis, hierarquia com negrito."

---

*Última atualização: Dezembro 2024*
