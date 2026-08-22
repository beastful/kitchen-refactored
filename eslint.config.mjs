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
  {
    rules: {
      // The 3D scene intentionally mutates Three.js objects and refs inside
      // R3F effects/frames. These compiler rules report that imperative API as
      // a React violation even though it is how Three.js rendering works here.
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react/display-name": "off",
      "@next/next/no-assign-module-variable": "off",
      "@typescript-eslint/no-wrapper-object-types": "off",
      // Several integration payloads are intentionally untyped at the
      // postMessage/Three.js boundaries. Keep them visible as warnings rather
      // than blocking the production lint command while they are migrated.
      "@typescript-eslint/no-explicit-any": "warn",
      // Static export uses native images with relative asset paths; next/image
      // would require a loader and would change the deployed asset URLs.
      "@next/next/no-img-element": "off",
    },
  },
]);

export default eslintConfig;
