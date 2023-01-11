import { defineConfig } from "vite";
import civetPlugin from "vite-plugin-civet";
import * as babel from "@babel/core";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    civetPlugin({
      // For simple uses of TypeScript, Civet can directly transform into JS:
      stripTypes: true,
      outputExtension: "jsx",
      transformOutput: (code, id, options) =>
        new Promise((resolve, reject) => {
          babel.transform(code, {}, (err, res) => {
            if (err) reject(err);
            else
              resolve({
                code: res.code,
                // TODO Make babel and rollup agree on the source map format
                map: null /* res.map */,
              });
          });
        }),
    }),
  ],
});
