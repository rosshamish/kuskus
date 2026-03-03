import { defineConfig, globalIgnores } from "eslint/config";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    globalIgnores(["**/eslint.config.mjs", "src/results-panel/**"]),
    {
        extends: compat.extends("plugin:@typescript-eslint/recommended", "plugin:prettier/recommended"),

        languageOptions: {
            parser: tsParser,
            ecmaVersion: 5,
            sourceType: "script",

            parserOptions: {
                project: ["./tsconfig.json"],
            },
        },
        rules: {
            "prettier/prettier": [
                "error",
                {
                    endOfLine: "auto"
                }
            ]
        }
    }
]);