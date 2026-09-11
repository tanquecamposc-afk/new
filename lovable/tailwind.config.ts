import type { Config } from "tailwindcss";

/**
 * Los colores salen de las variables de index.css. Añadir un color nuevo es
 * declararlo allí y darle nombre aquí; nunca hex sueltos en los componentes.
 */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "hsl(var(--void))",
        surface: "hsl(var(--surface))",
        "surface-2": "hsl(var(--surface-2))",
        line: "hsl(var(--line))",
        ink: "hsl(var(--ink))",
        dim: "hsl(var(--dim))",
        amber: "hsl(var(--amber))",
        danger: "hsl(var(--danger))",
        life: "hsl(var(--life))",
      },
      fontFamily: {
        pixel: ["'Pixelify Sans'", "ui-monospace", "monospace"],
        display: ["Bungee", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
      },
    },
  },
  plugins: [],
} satisfies Config;
