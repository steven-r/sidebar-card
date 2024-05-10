import globals from "globals";
import pluginJs from "@eslint/js";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";


export default [
  {
    ignores: ["dist/*", ".hass_dev/**"],
    files: [ "src/**/*.{js,ts}" ],
    languageOptions: {
      parser       : typescriptParser,
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },
  },
  pluginJs.configs.recommended
];