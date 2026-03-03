import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "client/out/test/suite/**/*.test.js",
  extensionDevelopmentPath: ".",
  workspaceFolder: "client/testFixture",
  mocha: {
    ui: "bdd",
    timeout: 20000,
  },
});
