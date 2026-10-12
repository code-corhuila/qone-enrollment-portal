// Loads an OpenAPI contract and compiles its schemas with Ajv, so a test can assert that a
// fixture or a handler response matches the contract (ADR-009). The contracts are the copies in
// contracts/openapi/, synced from qone-docs (07-api) by scripts/sync-contracts.sh, which records
// the source ref and commit in contracts/openapi/SOURCE. `$ref`s to `./_shared.yaml` and to
// `#/components/...` are resolved; OpenAPI's `nullable` becomes a type union.
import { readFile } from "node:fs/promises";
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { parse } from "yaml";

const DIR = new URL("../../contracts/openapi/", import.meta.url);

type Json = Record<string, unknown>;
const cache = new Map<string, Promise<Json>>();

async function fetchYaml(file: string): Promise<Json> {
  if (!cache.has(file)) {
    cache.set(
      file,
      readFile(new URL(file, DIR), "utf-8")
        .then((text) => parse(text) as Json)
        .catch((cause: unknown) => {
          throw new Error(`cannot load contract ${file}: run scripts/sync-contracts.sh (${String(cause)})`);
        }),
    );
  }
  return cache.get(file)!;
}

function deref(node: unknown, root: Json, shared: Json): unknown {
  if (Array.isArray(node)) return node.map((n) => deref(n, root, shared));
  if (typeof node !== "object" || node === null) return node;
  const obj = node as Json;
  if (typeof obj["$ref"] === "string") {
    const ref = obj["$ref"];
    const [file, pointer] = ref.split("#");
    const doc = file === "./_shared.yaml" ? shared : root;
    const target = (pointer ?? "").split("/").slice(1).reduce<unknown>((acc, key) => (acc as Json | undefined)?.[key], doc);
    if (target === undefined) throw new Error(`unresolved $ref ${ref}`);
    return deref(target, file === "./_shared.yaml" ? shared : root, shared);
  }
  const out: Json = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "example" || k === "examples" || k === "description" || k === "discriminator") continue;
    out[k] = deref(v, root, shared);
  }
  if (out["nullable"] === true) {
    delete out["nullable"];
    if (typeof out["type"] === "string") out["type"] = [out["type"], "null"];
    else if (Array.isArray(out["allOf"])) return { anyOf: [{ allOf: out["allOf"] }, { type: "null" }] };
  }
  return out;
}

export interface Contract {
  /** Validator of a named schema of the contract (components.schemas). */
  schema(name: string): ValidateFunction;
  /** Validator of the JSON response body of `method path` for a status, e.g. ("get", "/catalog/subjects", 200). */
  response(method: string, path: string, status: number): ValidateFunction;
}

export async function loadContract(file: string): Promise<Contract> {
  const [root, shared] = await Promise.all([fetchYaml(file), fetchYaml("_shared.yaml")]);
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);
  const compiled = new Map<string, ValidateFunction>();
  const compile = (key: string, node: unknown) => {
    if (!compiled.has(key)) compiled.set(key, ajv.compile(deref(node, root, shared) as Json));
    return compiled.get(key)!;
  };
  const schemas = ((root["components"] as Json)["schemas"] as Json) ?? {};
  const paths = (root["paths"] as Json) ?? {};
  return {
    schema: (name) => {
      if (!(name in schemas)) throw new Error(`schema ${name} not in ${file}`);
      return compile(`schema:${name}`, schemas[name]);
    },
    response: (method, path, status) => {
      const op = ((paths[path] as Json | undefined)?.[method.toLowerCase()] as Json | undefined);
      const res = ((op?.["responses"] as Json | undefined)?.[String(status)] as Json | undefined);
      const resolved = deref(res, root, shared) as Json | undefined;
      const body = (((resolved?.["content"] as Json | undefined)?.["application/json"] as Json | undefined)?.["schema"]);
      if (!body) throw new Error(`no JSON response for ${method.toUpperCase()} ${path} ${status} in ${file}`);
      return compile(`response:${method}:${path}:${status}`, body);
    },
  };
}

/** Throws with Ajv's errors when `value` does not match. */
export function expectValid(validate: ValidateFunction, value: unknown, label: string): void {
  if (!validate(value)) {
    throw new Error(`${label} does not match the contract:\n${JSON.stringify(validate.errors, null, 2)}`);
  }
}
