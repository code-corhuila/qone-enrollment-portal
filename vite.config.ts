/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { federation } from "@module-federation/vite";

// The enrollment portal: a Module Federation remote named after its domain that exposes ./App and
// consumes the shell's client and session (Annex H). The only URL it knows is the shell's
// remoteEntry (VITE_SHELL_URL); it never learns the gateway (norm 5.4.1). In tests, the shell
// modules resolve to local stubs so the portal is tested in isolation against MSW.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const shellEntry = `${(env["VITE_SHELL_URL"] ?? "http://localhost:5173").replace(/\/+$/, "")}/remoteEntry.js`;
  const isTest = mode === "test";
  const alias: Record<string, string> = isTest
    ? { "shell/apiClient": "/src/test/shell/apiClient.ts", "shell/session": "/src/test/shell/session.ts" }
    : {};

  return {
    plugins: [
      react(),
      ...(isTest
        ? []
        : [
            federation({
              name: "enrollment",
              filename: "remoteEntry.js",
              exposes: { "./App": "./src/enrollment/App.tsx" },
              remotes: { shell: { type: "module", name: "shell", entry: shellEntry } },
              shared: {
                react: { singleton: true },
                "react-dom": { singleton: true },
                "react-router": { singleton: true },
              },
              shareStrategy: "loaded-first",
              dts: false,
            }),
          ]),
    ],
    resolve: { alias },
    server: { port: 5003, strictPort: true, cors: true },
    preview: { port: 5003, strictPort: true, cors: true },
    build: { target: "esnext", sourcemap: false },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      css: false,
      testTimeout: 15000,
    },
  };
});
