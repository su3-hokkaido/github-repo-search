// Flat ESLint config (ESLint 9+). Uses the native flat configs shipped by
// eslint-config-next v16, which expose Core Web Vitals and TypeScript rules.

import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [".next/**", ".open-next/**", "node_modules/**", ".claude/**"],
  },
  {
    // テストでは next/image をプレーンな <img> でモックするため、当該ルールを無効化する。
    files: ["tests/**", "e2e/**"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
