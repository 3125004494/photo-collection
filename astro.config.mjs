import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// 纯静态导出；Tailwind v4 通过 Vite 插件集成
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
