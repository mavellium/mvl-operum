import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma generated files — not hand-written, linting them is noise
    "lib/generated/prisma/**",
    "notification-service/lib/generated/prisma/**",
    // Key-generation script — not part of the app, already gitignored
    "gerar-chaves.js",
    // Node.js helper scripts — CJS files that intentionally use require()
    "scripts/**",
    // NestJS compiled output — generated CommonJS, not hand-written
    "notification-service/dist/**",
  ]),
]);

export default eslintConfig;
