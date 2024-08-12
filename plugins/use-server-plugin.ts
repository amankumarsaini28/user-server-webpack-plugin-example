import type { Compiler, RspackPluginInstance } from "@rspack/core";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import slugify from "slugify";

import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { cwd } from "node:process";
import { join } from "node:path";

function generateSdk(contents: string) {
  const generatedPath = join(cwd(), "src", "__generated__");
  if (!existsSync(join(generatedPath, "server-sdk.js"))) {
    mkdirSync(generatedPath);
  }
  writeFileSync(join(generatedPath, "server-sdk.js"), contents);
}

const PLUGIN_NAME = "UseServerPlugin";

class SdkBuilder {
  private exportedFunctions: Record<string, string>;
  constructor() {
    this.exportedFunctions = {};
  }

  addFunction(name: string, code: string) {
    if (!this.exportedFunctions[name]) {
      this.exportedFunctions[name] = code;
    } else {
      console.error(`ERRDEDUPEFN:: ${name}`);
    }
  }

  generate() {
    return `
function createServerSdk() {
  const availableMethods = {
    ${Object.keys(this.exportedFunctions)
      .map((item) => {
        return `${item}: ${this.exportedFunctions[item].replace(/\n/g, " ")}`;
      })
      .join(",\n")}
  }
  async function invokeApi(identifier, args = []) {
    return availableMethods[identifier](...args);
  }

  return invokeApi;
}
    `;
  }
}

function getReplacement(name: string, id: string) {
  return `
async function ${name}() {
  return fetch('/api/internal/bff', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: '${id}',
      args: [...arguments]
    })
  }).then(r => r.json());
}
`;
}

export class UseServerPlugin implements RspackPluginInstance {
  constructor() {}
  apply(compiler: Compiler) {
    compiler.hooks.emit.tap(PLUGIN_NAME, (compilation) => {
      const sdk = new SdkBuilder();
      for (const filename in compilation.assets) {
        if (/\.js$/.test(filename)) {
          const source = compilation.assets[filename].source();
          const ast = parse(source, {
            sourceType: "module",
            plugins: ["jsx"],
          });

          traverse(ast, {
            DirectiveLiteral(path) {
              if (path.node.value === "use server") {
                // Extract the function or code block
                const { node: functionNode } = path.getFunctionParent() || {};
                if (functionNode) {
                  const functionCode = generate(functionNode).code;
                  const module = slugify(filename, {
                    remove: /[*+~.()\///'"!:@]/g,
                    replacement: "_",
                  });
                  const functionName = (
                    functionNode as { id: { name: string } }
                  ).id.name;
                  const functionId = `${module}__${functionName}`;
                  sdk.addFunction(functionId, functionCode);
                  const replacement = getReplacement(functionName, functionId);
                  path
                    .getFunctionParent()
                    ?.replaceWithSourceString(replacement);
                } else {
                  console.error(
                    `'use server'; directive should only be used inside an async function`,
                  );
                }
              }
            },
          });

          const output = generate(ast).code;
          type Source = Parameters<typeof compilation.updateAsset>[1];
          compilation.updateAsset(filename, {
            source: () => output,
            size: () => output.length,
          } as Source);

          generateSdk(sdk.generate());
        }
      }
    });
  }
}
