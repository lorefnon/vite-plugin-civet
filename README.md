# vite-plugin-civet

Experimental vite plugin for [Civet](https://civet.dev).

Civet is a new programming language that transpiles to TypeScript/JavaScript. It borrows many features from CoffeeScript, imba etc. and offers type-safety through TypeScript integration. With this plugin you can use civet in a vite project. You can use civet for your entire application or a subset of modules.

## Installation

Install it as a dev dependency through your preferred package manager (we recommend pnpm)

```bash
npm install -D vite-plugin-civet

# or
pnpm install -D vite-plugin-civet

# or
yarn add -D vite-plugin-civet
```

## Usage

Here is a simple example of a `vite.config.ts`,
with no processing beyond Civet:

```ts
import { defineConfig } from 'vite'
import civetPlugin from 'vite-plugin-civet'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    civetPlugin({
      // Remove TypeScript type annotations from output
      stripTypes: true,
    }),
  ],
})
```

It is recommended that type checking is performed separately
(either through editor integration or Civet CLI rather than as part of build).

### Integrations

Please note that civet (by design) does not include polyfills for older browsers. Nor does it have built-in support for transpiling non-standard JavaScript features like JSX to standard JavaScript.

While Civet offers syntax support for JSX, it does not make any assumptions around what that JSX will compile to. You will need additional framework-specific plugins to process the output of civet to standard JavaScript.

The following example `vite.config.ts` illustrates how this plugin can integrate with [vite-plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc).

```ts
import { defineConfig } from 'vite'
import reactPlugin from '@vitejs/plugin-react-swc'
import civetPlugin from 'vite-plugin-civet'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    reactPlugin(),
    civetPlugin({
      stripTypes: true,

      // Civet plugin needs to be made aware of the plugin
      // that will support TypeScript compilation
      outputTransformerPlugin: 'vite:react-swc',

      // Currently vite-plugin-react will not perform
      // any transformations unless file extension is js/jsx etc.
      //
      // So we need to change extension before passing
      // result of civet transformation to the plugin
      outputExtension: 'jsx',
    }),
  ],
})
```

Note that the `id` here is the Vite plugin id, different from the name of the package that defines the plugin. This id can be found in the object that the plugin's default export returns.

```
> (await import('@vitejs/plugin-react-swc')).default({})
[
  {
    name: 'vite:react-swc',  // <------
    apply: 'serve',
    ...
  },
  {
    name: 'vite:react-swc',
    apply: 'build',
    ...
  }
]
```

It should be possible to integrate plugins for other frameworks too in similar fashion. Please open an issue describing your use case if you face an issue.

### Sample projects

Sample framework specific projects are available to help you get started quickly:

- **React (Frontend):** `npx degit lorefnon/vite-plugin-civet/playground-react-babel my-app`
- **Solid (Frontend):** `npx degit lorefnon/vite-plugin-civet/playground-solid my-app`

# TODO

- [ ] Sourcemap integration

[LICENSE (MIT)](/LICENSE)
