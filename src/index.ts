import type { Plugin, TransformResult } from 'vite'
import { load as loadHTML } from 'cheerio'
import type { FilterPattern } from '@rollup/pluginutils'
import { createFilter } from '@rollup/pluginutils'
import civet from '@danielx/civet'
import fs from 'fs/promises'

interface PluginOptions {
  outputTransformerPlugin?: string | string[] | {
    build?: string | string[]
    serve?: string | string[]
  }
  outputExtension?: string
  stripTypes?: boolean
  include?: FilterPattern
  exclude?: FilterPattern
  transformOutput?: (
    code: string,
    id: string,
    options?: { ssr?: boolean }
  ) => TransformResult | Promise<TransformResult>
}

const TRANSFORM_SUFFIX = '?civet'

export default function plugin(pluginOpts: PluginOptions = {}): Plugin {
  const filter = createFilter(
    pluginOpts.include ?? '**/*.civet',
    pluginOpts.exclude ?? 'node_modules/**',
  )
  const parentPlugins: Plugin[] = []
  const stripTypes
    = pluginOpts.stripTypes ?? !pluginOpts.outputTransformerPlugin
  const outputExtension = pluginOpts.outputExtension ?? (stripTypes ? '.js' : '.ts')

  const resolveParentPluginIds = (command: 'build' | 'serve'): string[] => {
    if (!pluginOpts.outputTransformerPlugin)
      return []
    if (Array.isArray(pluginOpts.outputTransformerPlugin))
      return pluginOpts.outputTransformerPlugin
    if (typeof pluginOpts.outputTransformerPlugin === 'string')
      return [pluginOpts.outputTransformerPlugin]
    const pluginIds = pluginOpts.outputTransformerPlugin[command]
    if (typeof pluginIds === 'string')
      return [pluginIds]
    return pluginIds ?? []
  }

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

    configResolved(resolvedConfig) {
      if (!pluginOpts.outputTransformerPlugin)
        return
      for (const parentPluginId of resolveParentPluginIds(resolvedConfig.command)) {
        const parentPlugin = resolvedConfig.plugins?.find(it => it.name === parentPluginId)
        if (!parentPlugin) {
          throw new Error(
            `Unable to find plugin for specified outputTransformerPluginId: ${parentPluginId}: Is it added in vite config before vite-plugin-civet ?`,
          )
        }
        parentPlugins.push(parentPlugin)
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
      if (!filter(id))
        return null
      if (id.startsWith('C:/')) return null
      console.log('resolveId', id, options)
      const resolution = await this.resolve(id, importer, {
        skipSelf: true,
        ...options,
        assertions: {civet: "true"},
      })
      console.log('resolved', resolution)
      if (resolution && !resolution.external) {
        /*
        console.log('calling load')
        const moduleInfo = await this.load({...resolution,
          assertions: {civet: "true"},
          meta: {civet: {loading: true}}})
        console.log(moduleInfo)
        */
        const transformedId = `${id}.${outputExtension}${TRANSFORM_SUFFIX}`
        console.log('resolveId', id, '->', transformedId)
        return `${resolution.id}.${outputExtension}${TRANSFORM_SUFFIX}`
      }
      return resolution
      /*
      const transformedId = `${id}.${outputExtension}?transform`
      const resolution = await this.resolve(
        transformedId,
        importer,
        options,
      )
      console.log('resolved to', resolution)
      return resolution?.id
      */
    },

    async load(id) {
      if (!id.endsWith(TRANSFORM_SUFFIX))
        return null
      // Strip off `.${outputExtension}${TRANSFORM_SUFFIX}` from resolveId
      const filename = id.slice(0,
        -(1 + outputExtension.length + TRANSFORM_SUFFIX.length))
      const code = await fs.readFile(filename, 'utf-8')
      return {code, meta: {civet: {loading: true}}}
      /*
      let transformed: TransformResult = {
        code: civet.compile(code, {
          inlineMap: true,
          filename,
          js: stripTypes,
        } as any) as string,
        map: null,
        //id: id.slice(0, -TRANSFORM_SUFFIX.length),
      }
      */
      /*
      if (pluginOpts.transformOutput)
        transformed = await pluginOpts.transformOutput(transformed.code, id)
      for (const parentPlugin of parentPlugins) {
        if (parentPlugin?.transform) {
          const parentTransformHook = parentPlugin.transform
          const transformFn = (typeof parentTransformHook === 'function')
            ? parentTransformHook
            : parentTransformHook.handler
          const transformResult = await transformFn.apply(this, [
            transformed.code,
            `${id}.${outputExtension}`,
          ])
          if (typeof transformResult === 'string')
            transformed.code = transformResult
          else if (transformResult != null)
            Object.assign(transformed, transformResult)
        }
      }
      */
      console.log('load transformed', transformed)
      return transformed
    },

    async transform(code, id, options) {
      if (!id.endsWith(TRANSFORM_SUFFIX))
        return null
      console.log('transform', id)
      const jsId = id.slice(0, -TRANSFORM_SUFFIX.length)
      let transformed: TransformResult = {
        code: code, /*civet.compile(code, {
          inlineMap: true,
          filename: id,
          js: stripTypes,
        } as any) as string,*/
        map: null,
      }
      if (pluginOpts.transformOutput)
        transformed = await pluginOpts.transformOutput(transformed.code, id, options)

      for (const parentPlugin of parentPlugins) {
        if (parentPlugin?.transform) {
          const parentTransformHook = parentPlugin.transform
          const transformFn = (typeof parentTransformHook === 'function')
            ? parentTransformHook
            : parentTransformHook.handler
          const transformResult = await transformFn.apply(this, [
            transformed.code,
            jsId, //`${id}.${outputExtension}`,
            options,
          ])
          if (typeof transformResult === 'string')
            transformed.code = transformResult
          else if (transformResult != null)
            Object.assign(transformed, transformResult)
        }
      }

      console.log('transformed', transformed)
      return transformed
    },
  }
}
