import fs from 'node:fs/promises'
import type { Plugin, ResolvedConfig, TransformResult } from 'vite'
import { load as loadHTML } from 'cheerio'
import type { FilterPattern } from '@rollup/pluginutils'
import { createFilter } from '@rollup/pluginutils'
import civet from '@danielx/civet'
import ts from 'typescript'
import type { CustomTransformers } from 'typescript'

type SimpleTransform = (
  code: string,
  id: string,
  options?: { ssr?: boolean },
) => TransformResult | Promise<TransformResult>

interface PluginOptions {
  outputTransformerPlugin?: {
    build?: (SimpleTransform | Plugin['name'])[]
    serve?: (SimpleTransform | Plugin['name'])[]
  }
  transformers?: {
    build?: CustomTransformers
    serve?: CustomTransformers
  }
  outputExtension?: `.${string}`
  stripTypes?: boolean
  include?: FilterPattern
  exclude?: FilterPattern
  transformOutput?: SimpleTransform
}

export default function plugin(opts: PluginOptions = {}): Plugin {
  opts.outputTransformerPlugin ||= {}
  opts.outputTransformerPlugin.build ||= []
  opts.outputTransformerPlugin.serve ||= []
  const filter = createFilter(
    opts.include ?? '**/*.civet',
    opts.exclude ?? 'node_modules/**',
  )
  const parentTransforms: SimpleTransform[] = []
  const stripTypes
    = opts.stripTypes ?? !opts.outputTransformerPlugin
  const outputExtension = opts.outputExtension ?? (stripTypes ? '.js' : '.ts')
  let cmd: ResolvedConfig['command'] = 'serve'

  return {
    name: 'vite:civet',
    enforce: 'pre', // run esbuild after transform
    config(config, { command }) {
      // Ensure esbuild runs on .civet files
      if (command === 'build') {
        return {
          esbuild: {
            include: [/\.civet$/],
            loader: 'tsx',
          },
        }
      }
    },
    async configResolved(resolvedConfig) {
      cmd = resolvedConfig.command
      const pluginOpts = opts.outputTransformerPlugin?.[cmd] || []
      for (const p of pluginOpts) {
        if (typeof p === 'string') {
          const plugin = resolvedConfig.plugins?.find(it => it.name === p)
          if (!plugin || !plugin.transform) {
            throw new Error(
              `Unable to find plugin for specified outputTransformerPluginId: ${p}: Is it added in vite config before vite-plugin-civet ?`,
            )
          }
          parentTransforms.push(plugin.transform as SimpleTransform)
        }
        else {
          parentTransforms.push(p)
        }
      }
    },
    transformIndexHtml(html: string) {
      const $ = loadHTML(html)
      $('script').each(function () {
        const el = $(this)
        const src = el.attr('src')
        if (src?.match(/\.civet$/))
          el.attr('src', src.replace(/\.civet$/, '.civet.js?transform'))
      })
      return $.html()
    },
    async resolveId(id, importer, options) {
      if (id.match(/\.civet/)) {
        const [pathPart, queryPart] = id.split('?')
        if (pathPart.match(/\.civet\.js$/) && queryPart === 'transform') {
          const transformedId = pathPart.replace(/\.js$/, '')
          const resolution = await this.resolve(
            transformedId,
            importer,
            options,
          )
          return resolution?.id
        }
      }
    },
    async transform(code, id, options) {
      if (!filter(id))
        return null
      let transformed: TransformResult = {
        code: civet.compile(code, {
          inlineMap: true,
          filename: id,
          js: stripTypes,
        } as any) as string,
        map: null,
      }
      if (opts.transformOutput)
        transformed = await opts.transformOutput(transformed.code, id, options)

      for (const p of parentTransforms) {
        const r = p.apply(this,
          [
            transformed.code,
            `${id}.${outputExtension}`,
            options,
          ],
        )

        if ('then' in r)
          transformed = await r

        else
          transformed = r
      }
      return transformed
    },
  }
}

export function pluginCivetIdeSupport(opts: PluginOptions = {}): Plugin {
  const filter = createFilter('**/*.civet')
  opts.outputTransformerPlugin ||= {}
  opts.outputTransformerPlugin.serve ||= []
  async function myTransformer(code: string, id: string) {
    if (!filter(id))
      return null
    lazyDtsFile(code, id)
    return {
      code, map: null,
    }
  }
  opts.outputTransformerPlugin.serve.push(myTransformer as SimpleTransform)
  async function lazyDtsFile(code: string, id: string) {
    const firstfileName = id.replace('.civet.js', 'civet')
    const fileName = `${id}.d.ts`
    const dtsFile = ts.transpileModule(code, {
      fileName: firstfileName,
      compilerOptions: {
        declaration: true,
        declarationMap: true,
        target: ts.ScriptTarget.ESNext,
        inlineSourceMap: false,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        allowArbitraryExtensions: true,
        allowImportingTsExtensions: true,
        emitDeclarationOnly: true,
        skipLibCheck: true,
        strictBindCallApply: true,
        sourceMap: true,
      },
      transformers: opts.transformers?.serve,
    })
    function fixSrcMapData(dtsFile: ts.TranspileOutput) {
      if (dtsFile.sourceMapText) {
        dtsFile.sourceMapText = dtsFile.sourceMapText.replace('.civet.js', '.civet.d.ts')
        const lastStr = '\n//# sourceMappingURL='
        const lindex = dtsFile.outputText.lastIndexOf(lastStr)
        const pre = dtsFile.outputText.slice(0, lindex)
        return `${pre}\n\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${btoa(dtsFile.sourceMapText)}`
      }
      return dtsFile.outputText
    }
    return fs.writeFile(fileName, fixSrcMapData(dtsFile))
  }
  return plugin(opts)
}
