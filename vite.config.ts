import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';


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
  return false;
}
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
        launchpadPreviewWatchIgnored,
      ],
    },
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
},react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
