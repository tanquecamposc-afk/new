import type { Config } from "tailwindcss";

// El HUD del juego trae su propio CSS (src/game/styles.ts). Tailwind se usa
// para la carcasa de la aplicacion: portada, avisos y paginas alrededor.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#04070f",
        panel: "#101c3f",
        line: "#32509e",
        arise: "#2fe4ff",
        monarch: "#bb8cff",
      },
      fontFamily: {
        display: ["Cinzel", "Georgia", "serif"],
        ui: ["Fredoka", "Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
