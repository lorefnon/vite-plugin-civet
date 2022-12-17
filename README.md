# vite-plugin-civet 

Experimental vite plugin for [civet](https://github.com/DanielXMoore/Civet)

Civet is a new programming language that transpiles to typescript/javascript. It borrows many features from Coffeescript, imba etc. and offers type-safety through typescript integration. With this plugin you can use civet in a vite project. You can use civet for your entire application or a subset of modules.

## Installation

Install it as a dev dependency through your preferred package manager (we recomend pnpm)

```bash
npm install -D vite-plugin-civet

# or 
pnpm install -D vite-plugin-civet

# or
yarn add vite-plugin-civet -D
```

## Usage

```ts
import { defineConfig } from 'vite'
import reactPlugin from '@vitejs/plugin-react'
import civetPlugin from 'vite-plugin-civet'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    civetPlugin({
      // Remove typescript type annotations from output
      stripTypes: true,
    }),
  ],
})
```

It is recomended that type-checking is performed separately (either through editor integration or civet cli rather than as part of build)

### Integrations

Please note that civet does not offer any polyfills. Nor does it have inbuilt support for non-standard javascript features. This includes JSX. 

While Civet offers syntax support for JSX it does not make any assumptions around what that JSX will compile to. You will need additional framework-specific plugins to process the output of civet to standard javascript.

Following example illustrates how this plugin can be integrated with [vite-plugin-react](https://github.com/vitejs/vite-plugin-react). 

```ts
import { defineConfig } from 'vite'
import reactPlugin from '@vitejs/plugin-react'
import civetPlugin from 'vite-plugin-civet'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    reactPlugin({
      babel: {
        presets: [
          '@babel/preset-react',
        ],
      },
    }),
    civetPlugin({
      stripTypes: true,

      // Civet plugin needs to be made aware of the plugin
      // that will support typescript compilation
      outputTransformerPlugin: 'vite:react-babel',

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

It should be possible to integrate plugins for other frameworks too in similar fashion. Please open an issue describing your use case if you face an issue.

[LICENSE (MIT)](/LICENSE)
