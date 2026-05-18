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
  ]),
  // Test files: relax rules that don't apply to test code.
  {
    files: ["src/tests/**/*.{ts,tsx}", "**/*.test.{ts,tsx}"],
    rules: {
      // Inline `wrapper` components for renderHook don't need a displayName.
      "react/display-name": "off",
      // useEffect-style "exhaustive-deps" is noisy in test harnesses.
      "react-hooks/exhaustive-deps": "off",
      // <img> warnings don't matter in tests.
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
