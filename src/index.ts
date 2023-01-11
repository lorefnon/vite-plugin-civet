import type { Plugin, TransformResult } from 'vite'
import { load as loadHTML } from 'cheerio'
import type { FilterPattern } from '@rollup/pluginutils'
import { createFilter } from '@rollup/pluginutils'
import civet from '@danielx/civet'

interface PluginOptions {
  outputTransformerPlugin?: string
  outputExtension?: string
  stripTypes?: boolean
  include?: FilterPattern
  exclude?: FilterPattern
  transformOutput?: (code: string, id: string, options?: { ssr?: boolean }) => TransformResult | Promise<TransformResult>
}

export default function plugin(pluginOpts: PluginOptions = {}): Plugin {
  const filter = createFilter(
    pluginOpts.include ?? '**/*.civet',
    pluginOpts.exclude ?? 'node_modules/**',
  )
  let parentPlugin: Plugin | undefined
  const stripTypes
    = pluginOpts.stripTypes ?? !pluginOpts.outputTransformerPlugin
  const outputExtension = pluginOpts.outputExtension ?? (stripTypes ? '.js' : '.ts')

  return {
    name: 'vite:civet',

    configResolved(resolvedConfig) {
      const parentPluginId = pluginOpts.outputTransformerPlugin
      if (parentPluginId) {
        parentPlugin = resolvedConfig.plugins?.find(it => it.name === parentPluginId)
        if (!parentPlugin) {
          throw new Error(
            `Unable to find plugin for specified outputTransformerPluginId: ${parentPluginId}: Is it added in vite config before vite-plugin-civet ?`,
          )
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
          js: !stripTypes,
        } as any) as string,
        map: null,
      }
      if (pluginOpts.transformOutput)
        transformed = await pluginOpts.transformOutput(transformed.code, id, options)

      if (parentPlugin?.transform) {
        const parentTransformHook = parentPlugin.transform
        const transformFn = (typeof parentTransformHook === 'function')
          ? parentTransformHook
          : parentTransformHook.handler
        const transformResult = await transformFn.apply(this, [
          transformed.code,
          `${id}.${outputExtension}`,
          options,
        ])
        if (transformResult == null) {
          console.warn(
            `Parent plugin ${parentPlugin.name} refused to transform output of vite-plugin-civet`,
          )
        }
        else { return transformResult }
      }
      return transformed
    },
  }
}
