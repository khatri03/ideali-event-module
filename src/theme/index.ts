import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const config = defineConfig({
  // Only activate dark when data-theme="dark" is explicitly set — ignore OS preference
  conditions: {
    _dark: "[data-theme=dark] &",
  },
  globalCss: {
    "button:not(:disabled), [role='button'], [role='menuitem'], a[href], summary, label[for]": {
      cursor: "pointer",
    },
    "button:disabled, [aria-disabled='true'], [disabled], [readonly], input[readonly], textarea[readonly], select[readonly], input:disabled, textarea:disabled, select:disabled": {
      cursor: "not-allowed",
    },
  },
  theme: {
    tokens: {
      fonts: {
        heading: { value: `'DM Sans', sans-serif` },
        body: { value: `'DM Sans', sans-serif` },
        mono: { value: `'DM Mono', 'Fira Code', monospace` },
      },
      colors: {
        // Horizon UI brand purple — exact palette
        brand: {
          100: { value: "#E9E3FF" },
          200: { value: "#422AFB" },
          300: { value: "#422AFB" },
          400: { value: "#7551FF" },
          500: { value: "#422AFB" },
          600: { value: "#3311DB" },
          700: { value: "#02044A" },
          800: { value: "#190793" },
          900: { value: "#11047A" },
        },
        // Horizon UI secondary gray — used for borders, backgrounds, muted text
        secondaryGray: {
          100: { value: "#E0E5F2" },
          200: { value: "#E1E9F8" },
          300: { value: "#F4F7FE" },
          400: { value: "#E9EDF7" },
          500: { value: "#8F9BBA" },
          600: { value: "#A3AED0" },
          700: { value: "#707EAE" },
          800: { value: "#707EAE" },
          900: { value: "#1B2559" },
        },
        // Horizon UI navy — dark mode surfaces
        navy: {
          50: { value: "#d0dcfb" },
          100: { value: "#aac0fe" },
          200: { value: "#a3b9f8" },
          300: { value: "#728fea" },
          400: { value: "#3652ba" },
          500: { value: "#1b3bbb" },
          600: { value: "#24388a" },
          700: { value: "#1B254B" },
          800: { value: "#111c44" },
          900: { value: "#0b1437" },
        },
        // Semantic status colors — Horizon UI. The 700 shades exist so status text can sit on its own
        // tinted background at WCAG AA; the 500 shades fail that contrast and are for fills and icons.
        red: {
          100: { value: "#FEEFEE" },
          500: { value: "#EE5D50" },
          600: { value: "#E31A1A" },
          700: { value: "#A81111" },
        },
        blue: {
          50: { value: "#EFF4FB" },
          500: { value: "#3965FF" },
          700: { value: "#1F3FA8" },
        },
        orange: {
          100: { value: "#FFF6DA" },
          500: { value: "#FFB547" },
          700: { value: "#8A5A00" },
        },
        green: {
          100: { value: "#E6FAF5" },
          500: { value: "#01B574" },
          700: { value: "#017A4F" },
        },
      },
      radii: {
        card: { value: "20px" },
        button: { value: "16px" },
      },
      shadows: {
        card: { value: "0px 18px 40px rgba(112, 144, 176, 0.12)" },
        cardHover: { value: "0px 25px 50px rgba(112, 144, 176, 0.2)" },
        button: { value: "45px 76px 113px 7px rgba(112, 144, 176, 0.08)" },
      },
    },
    semanticTokens: {
      colors: {
        brand: {
          solid: { value: "{colors.brand.400}" },
          contrast: { value: "white" },
          fg: { value: "{colors.brand.600}" },
          muted: { value: "{colors.brand.100}" },
          subtle: { value: "{colors.secondaryGray.300}" },
          emphasized: { value: "{colors.secondaryGray.200}" },
          focusRing: { value: "{colors.brand.400}" },
        },
        // The Horizon brand wash, as a token rather than an inline style, so a brand change is one edit.
        "brand.gradient": {
          value: "linear-gradient(135deg, {colors.brand.400} 0%, {colors.brand.500} 100%)",
        },
        "app.bg": {
          value: {
            base: "{colors.secondaryGray.300}",
            _dark: "{colors.navy.900}",
          },
        },
        "card.bg": {
          value: {
            base: "white",
            _dark: "{colors.navy.800}",
          },
        },
        "topbar.bg": {
          value: {
            base: "rgba(244, 247, 254, 0.7)",
            _dark: "rgba(11, 20, 55, 0.7)",
          },
        },
        "text.primary": {
          value: {
            base: "{colors.secondaryGray.900}",
            _dark: "white",
          },
        },
        "text.secondary": {
          value: {
            base: "{colors.secondaryGray.600}",
            _dark: "{colors.navy.300}",
          },
        },
        "border.subtle": {
          value: {
            base: "{colors.secondaryGray.100}",
            _dark: "{colors.navy.700}",
          },
        },
        // Status colors as semantic tokens for consistent usage
        "status.success": {
          value: {
            base: "{colors.green.500}",
            _dark: "{colors.green.500}",
          },
        },
        "status.success.bg": {
          value: {
            base: "{colors.green.100}",
            _dark: "rgba(1, 181, 116, 0.15)",
          },
        },
        // Text sitting on the matching .bg. Light mode needs the darkened shade to clear AA; dark mode
        // puts the same tint on navy, where the brighter 500 is the readable one.
        "status.success.fg": {
          value: {
            base: "{colors.green.700}",
            _dark: "{colors.green.500}",
          },
        },
        "status.warning": {
          value: {
            base: "{colors.orange.500}",
            _dark: "{colors.orange.500}",
          },
        },
        "status.warning.bg": {
          value: {
            base: "{colors.orange.100}",
            _dark: "rgba(255, 181, 71, 0.15)",
          },
        },
        "status.warning.fg": {
          value: {
            base: "{colors.orange.700}",
            _dark: "{colors.orange.500}",
          },
        },
        "status.error": {
          value: {
            base: "{colors.red.500}",
            _dark: "{colors.red.500}",
          },
        },
        "status.error.bg": {
          value: {
            base: "{colors.red.100}",
            _dark: "rgba(238, 93, 80, 0.15)",
          },
        },
        "status.error.fg": {
          value: {
            base: "{colors.red.700}",
            _dark: "{colors.red.500}",
          },
        },
        "status.info": {
          value: {
            base: "{colors.blue.500}",
            _dark: "{colors.blue.500}",
          },
        },
        "status.info.bg": {
          value: {
            base: "{colors.blue.50}",
            _dark: "rgba(57, 101, 255, 0.15)",
          },
        },
        "status.info.fg": {
          value: {
            base: "{colors.blue.700}",
            _dark: "{colors.blue.500}",
          },
        },
        "status.neutral.bg": {
          value: {
            base: "{colors.secondaryGray.300}",
            _dark: "{colors.navy.700}",
          },
        },
        "status.neutral.fg": {
          value: {
            base: "{colors.secondaryGray.900}",
            _dark: "{colors.navy.100}",
          },
        },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
