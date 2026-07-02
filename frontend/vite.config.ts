/// <reference types="vitest/config" />

import path from "node:path";

function launchpadPreviewWatchIgnored(filePath: string): boolean {
  var p = String(filePath || "").replace(/\\/g, "/");
  if (!p) return false;
  if (p.includes("/node_modules/")) return true;
  if (/\.(test|spec)\.(tsx?|jsx?|mjs|cjs)$/i.test(p)) return true;
  if (/\/__(tests|mocks)__\//i.test(p)) return true;
  if (/\/coverage\//i.test(p)) return true;
  if (/(^|\/)\.platform(\/|$)/.test(p)) return true;
  if (/(^|\/)preview\.log$/i.test(p)) return true;
  if (/ecosystem\.preview\.(cjs|js)$/i.test(p)) return true;
  if (/\.lp-basename\.bak$/i.test(p)) return true;
  if (/(^|\/)vitest\.(config|setup)\./i.test(p)) return true;
  if (/(^|\/)jest\.(config|setup)\./i.test(p)) return true;
  if (/\.snap$/i.test(p)) return true;
  if (/\/__(snapshots)__\//i.test(p)) return true;
  if (/(^|\/)(dist|build|out)(\/|$)/.test(p)) return true;
  if (/(^|\/)\.next(\/|$)/.test(p)) return true;
  if (/\.tsbuildinfo$/i.test(p)) return true;
  if (/(^|\/)\.cursor(\/|$)/.test(p)) return true;
  if (/(^|\/)graphify-out(\/|$)/.test(p)) return true;
  if (/(^|\/)\.understand-anything(\/|$)/.test(p)) return true;
  if (/(^|\/)playwright-report(\/|$)/.test(p)) return true;
  if (/(^|\/)\.specify(\/|$)/.test(p)) return true;
  if (/(^|\/)\.infrapilot(\/|$)/.test(p)) return true;
  return false;
}
// https://vite.dev/config/
import { fileURLToPath } from "node:url";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  server: {
    host: "0.0.0.0",
    strictPort: true,
    allowedHosts: true,
    watch: {
      // launchpadPreviewWatchIgnored — do not remove (embed HMR)
      // launchpadPreviewWatchPolling — do not remove (embed HMR)
      usePolling: true,
      interval: 250,
      binaryInterval: 600,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
      ignored: [
        "**/*.{test,spec}.{js,ts,jsx,tsx,mjs,cjs}",
        "**/__tests__/**",
        "**/__mocks__/**",
        "**/coverage/**",
        "**/.platform/**",
        "**/preview.log",
        "**/.vitest/**",
        "**/*.snap",
        "**/__snapshots__/**",
        "**/dist/**",
        "**/build/**",
        "**/out/**",
        "**/.next/**",
        "**/*.tsbuildinfo",
        "**/.cursor/**",
        "**/graphify-out/**",
        "**/.understand-anything/**",
        "**/playwright-report/**",
        "**/.specify/**",
        "**/.infrapilot/**",
        launchpadPreviewWatchIgnored,
      ],
    },
  },
	build: {
		sourcemap: "hidden",
	},
	plugins: [
{
  name: "launchpad-suppress-test-file-reload",
  configureServer: function(server) {
    var extra = launchpadPreviewWatchIgnored;
    var ign = server.watcher.options.ignored;
    if (Array.isArray(ign)) {
      if (!ign.some(function(i) { return i === extra; })) ign.push(extra);
    } else if (ign) {
      server.watcher.options.ignored = [ign, extra];
    } else {
      server.watcher.options.ignored = [extra];
    }
  },
  handleHotUpdate: function(ctx) {
    var p = String(ctx.file || "").replace(/\\/g, "/");
    if (typeof launchpadPreviewWatchIgnored === "function" && launchpadPreviewWatchIgnored(p)) {
      return [];
    }
    if (/\.(css|pcss|scss|sass|less)$/.test(p) && ctx.modules && ctx.modules.length) {
      var cssOnlyNonApp = ctx.modules.every(function(mod) {
        var importers = mod.importers ? Array.from(mod.importers) : [];
        if (!importers.length) return true;
        return importers.every(function(imp) {
          var u = String((imp.url || imp.id || "")).replace(/\\/g, "/");
          if (/\.(css|pcss|scss|sass|less)(\?|$)/.test(u)) return true;
          if (typeof launchpadPreviewWatchIgnored === "function" && launchpadPreviewWatchIgnored(u)) {
            return true;
          }
          return false;
        });
      });
      if (cssOnlyNonApp) return [];
    }
    return undefined;
  },
},
		react({
			babel: {
				plugins: [
					[
						"@locator/babel-jsx/dist",
						{
							env: "development",
						},
					],
				],
			},
		}),
		tailwindcss(),
		...(process.env.SENTRY_AUTH_TOKEN
			? [
					sentryVitePlugin({
						org: process.env.SENTRY_ORG,
						project: process.env.SENTRY_PROJECT_FRONTEND,
						authToken: process.env.SENTRY_AUTH_TOKEN,
						release: { name: process.env.VITE_SENTRY_RELEASE },
					}),
				]
			: []),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	test: {
    cache: { dir: ".platform/vitest-cache" }, // launchpad embed HMR
		projects: [
			{
				test: {
					name: "unit",
					environment: "node",
					include: ["src/test/**/*.ts"],
					alias: {
						"@": path.resolve(__dirname, "src"),
					},
				},
			},
			{
				extends: true,
				plugins: [
					// The plugin will run tests for the stories defined in your Storybook config
					// See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
					storybookTest({
						configDir: path.join(__dirname, ".storybook"),
					}),
				],
				test: {
					name: "storybook",
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({}),
						instances: [
							{
								browser: "chromium",
							},
						],
					},
					setupFiles: [".storybook/vitest.setup.ts"],
				},
			},
		],
	},
});
