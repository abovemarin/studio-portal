import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Full jsx-a11y *recommended* set, on top of the ~6 rules eslint-config-next enables. Rules
  // only (the `jsx-a11y` plugin is already registered by eslint-config-next) — re-registering it
  // would be a flat-config "plugin redefined" conflict. Runs in `pnpm lint`, so it's part of the
  // CI gate and a11y regressions can't merge. NOTE: this catches MECHANICAL issues only (missing
  // alt/label/role, bad aria) — it does NOT verify focus landing, contrast, or keyboard operation.
  // Those stay on the manual checklist.
  {
    name: "jsx-a11y/recommended-rules",
    files: ["**/*.{jsx,tsx}"],
    rules: jsxA11y.flatConfigs.recommended.rules,
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
