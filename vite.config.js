import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// export default config using defineConfig for type safety and intellisense
export default defineConfig({
  plugins: [react()], // enable React fast refresh and JSX

  build: {
    outDir: "dist", // where Vite should output production files
    emptyOutDir: true, // clean the output folder before each build
  },

  base: "./", // for file paths when loading local files via file://
});
