import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const sharedOptions = {
  bundle: true,
  minify: !watch,
  sourcemap: true,
};

// Extension host bundle (Node.js, CommonJS)
const extensionConfig = {
  ...sharedOptions,
  entryPoints: ["src/extension.ts"],
  outfile: "dist/extension.js",
  platform: "node",
  format: "cjs",
  external: ["vscode", "esbuild"],
};

// Webview bundle (browser, IIFE, React bundled)
const webviewConfig = {
  ...sharedOptions,
  entryPoints: ["src/webview/index.tsx"],
  outfile: "dist/webview.js",
  platform: "browser",
  format: "iife",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
};

if (watch) {
  const extensionCtx = await esbuild.context(extensionConfig);
  const webviewCtx = await esbuild.context(webviewConfig);
  await Promise.all([extensionCtx.watch(), webviewCtx.watch()]);
  console.log("Watching for changes...");
} else {
  await Promise.all([
    esbuild.build(extensionConfig),
    esbuild.build(webviewConfig),
  ]);
  console.log("Build complete.");
}
