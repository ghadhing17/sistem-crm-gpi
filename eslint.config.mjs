import nextConfig from "eslint-config-next";
import prettierConfig from "eslint-config-prettier";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  // Next.js 16 flat config — sudah include React, TypeScript, dan Next.js rules
  ...nextConfig,

  // Prettier — matikan rules ESLint yang konflik dengan formatting Prettier
  prettierConfig,

  // Custom rules project
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default eslintConfig;
