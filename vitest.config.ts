import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["test/**/*.test.ts"],
		browser: {
			enabled: true,
			headless: true,
			instances: [{ browser: "chromium" }, { browser: "firefox" }, { browser: "webkit" }],
			provider: playwright(),
		},
		coverage: {
			enabled: true,
			provider: "istanbul",
			reporter: ["text", "lcov", "html"],
			include: ["src/**/*.ts"],
			exclude: ["**/*.test.ts", "**/*.spec.ts"],
		},
	},
});
