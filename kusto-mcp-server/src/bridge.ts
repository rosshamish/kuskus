// Side-effect imports that load the Kusto WASM bridge into global scope.
// Must be first imports in the process — same pattern as kusto-language-server/server/src/server.ts
import { createRequire } from "module";
const require = createRequire(import.meta.url);

require("@kusto/language-service-next/bridge");
require("@kusto/language-service-next/Kusto.Language.Bridge");

declare const Kusto: any;

export function makeCodeScript(text: string): any {
  const globalState = Kusto.Language.GlobalState.Default;
  return Kusto.Language.Editor.CodeScript.From$1(text, globalState);
}

export function getKustoGlobal(): any {
  return Kusto;
}
