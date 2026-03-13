import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "node",
		include: ["test/**/*.test.ts"],
		coverage: {
			enabled: true,
			provider: "istanbul",
			reporter: ["text", "lcov", "html"],
			include: ["src/**/*.ts"],
			exclude: ["**/*.test.ts", "**/*.spec.ts"],
		},
	},
});
