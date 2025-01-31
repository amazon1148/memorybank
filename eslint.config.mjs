import globals from "globals"
import typescriptParser from "@typescript-eslint/parser"
import typescriptPlugin from "@typescript-eslint/eslint-plugin"
import { FlatCompat } from "@eslint/eslintrc"

const compat = new FlatCompat({
	recommendedConfig: {
		env: {
			es2022: true,
			node: true,
		},
	},
})

export default [
	{
		ignores: ["dist/**", "coverage/**", "vitest.config.ts"],
	},
	...compat.extends("eslint:recommended"),
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: typescriptParser,
			parserOptions: {
				project: ["./tsconfig.json", "./tests/tsconfig.json"],
				ecmaVersion: "latest",
				sourceType: "module",
			},
			globals: {
				...globals.node,
				...globals.jest, // Vitest is compatible with Jest globals
			},
		},
		plugins: {
			"@typescript-eslint": typescriptPlugin,
		},
		rules: {
			...typescriptPlugin.configs.recommended.rules,
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^[A-Z][A-Z_]+$", // Ignore uppercase constants
				},
			],
			"@typescript-eslint/explicit-function-return-type": "off",
		},
	},
	{
		files: ["**/tests/**/*.ts"],
		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-non-null-assertion": "off",
		},
	},
]
