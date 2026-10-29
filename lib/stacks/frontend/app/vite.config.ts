import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
// Cloudscape has internal circular dependencies that cause "Cannot access X before initialization"
// errors when bundled with certain configurations. This config avoids those issues.
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
        // Dedupe to ensure single instances
        dedupe: [
            'react', 
            'react-dom',
            '@cloudscape-design/components',
            '@cloudscape-design/component-toolkit',
        ],
    },
    optimizeDeps: {
        include: [
            "@cloudscape-design/components",
            "@cloudscape-design/global-styles",
            "@cloudscape-design/design-tokens",
            "@cloudscape-design/component-toolkit",
            "@cloudscape-design/chat-components",
            "@cloudscape-design/code-view",
            "react",
            "react-dom",
        ],
        // Force esbuild to use esnext to avoid certain transformations
        esbuildOptions: {
            target: 'esnext',
        },
    },
    // Use terser instead of esbuild for minification - it handles circular deps better
    build: {
        target: 'esnext',
        minify: 'terser',
        terserOptions: {
            // Keep function names and class names to avoid initialization order issues
            keep_fnames: true,
            keep_classnames: true,
            // Disable mangling to preserve variable names
            mangle: false,
            compress: {
                // Disable optimizations that can break circular dependencies
                collapse_vars: false,
                reduce_vars: false,
                inline: false,
                sequences: false,
            },
        },
        commonjsOptions: {
            include: [/node_modules/],
            transformMixedEsModules: true,
        },
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'),
                crm: path.resolve(__dirname, 'crm-standalone.html'),
            },
            output: {
                // Keep modules separate to avoid circular dependency issues
                // This creates more files but preserves module initialization order
                manualChunks: undefined,
            },
        },
    },
});
