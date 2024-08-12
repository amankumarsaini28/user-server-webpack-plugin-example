import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { UseServerPlugin } from "./plugins/use-server-plugin";

export default defineConfig({
  plugins: [pluginReact()],
  tools: {
    rspack: {
      plugins: [new UseServerPlugin()],
    },
  },
});
