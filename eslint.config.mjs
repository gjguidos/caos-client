import eslint from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default [
  // Core JavaScript recommended rules
  eslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: __dirname,
        sourceType: "module",
      },
      globals: {
        // Node.js globals (server-side code)
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        // Browser globals (client-side code)
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        fetch: "readonly",
        alert: "readonly",
        // Timers (both Node.js and browser)
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        // Encoding (both Node.js and browser)
        atob: "readonly",
        btoa: "readonly",
        // Browser storage (client-side code)
        localStorage: "readonly",
        sessionStorage: "readonly",
        // Modern JavaScript globals
        structuredClone: "readonly",
        // React (JSX runtime)
        React: "readonly",
        // TypeScript globals
        NodeJS: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "@next/next": nextPlugin,
    },
    rules: {
      // Next.js recommended rules
      ...(nextPlugin.configs && nextPlugin.configs.recommended
        ? nextPlugin.configs.recommended.rules
        : {}),
      ...(nextPlugin.configs && nextPlugin.configs["core-web-vitals"]
        ? nextPlugin.configs["core-web-vitals"].rules
        : {}),

      // TypeScript-aware unused vars
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // TypeScript-specific rules
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // General code quality
      "no-console": "warn",
      "no-debugger": "error",
      "prefer-const": "error",
    },
  }, // React/JSX specific rules
  {
    files: ["**/*.{jsx,tsx}"],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {},
  }, // Configuration files (CommonJS) - allow Node globals
  {
    files: ["**/*.config.{js,cjs,mjs}", "**/.*rc.js"],
    languageOptions: {
      globals: {
        module: "readonly",
        exports: "readonly",
        require: "readonly",
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
  }, // Vitest/Testing specific configuration
  {
    files: ["vitest.setup.ts", "**/*.test.{ts,tsx}"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        vi: "readonly",
      },
    },
  }, // The Redux store is created per ReduxProvider mount, not shared at module scope
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/providers/ReduxProvider.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/store",
              importNames: ["default"],
              message:
                "The store is per-request. Use useAppSelector/useAppDispatch, or useAppStore() to reach it without subscribing.",
            },
          ],
        },
      ],
    },
  }, // Global ignores
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "dist/**",
      "build/**",
      "public/**",
      ".eslintrc.*",
    ],
  },
];
