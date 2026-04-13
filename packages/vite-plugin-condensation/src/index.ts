import type { Plugin, ResolvedConfig } from 'vite'
import { isAbsolute, join } from 'node:path'
import Debug from 'debug'
import zlib from 'node:zlib'
import { isFunction, isRegExp, readAllFile } from './utils'
import { CondensationOptions, VitePluginCondensationOption } from './types'
import { readFile, stat, remove, writeFile } from 'fs-extra'
import { performance, PerformanceObserver } from 'node:perf_hooks'

const defaultRE = /\.(js|mjs|json|css|html|jpg|gif|png|svg)$/i

const debug = Debug.debug('vite-plugin-condensation')

const mtimeCache = new Map<string, number>()

const perfObserver = new PerformanceObserver((items) => { 
  items.getEntries().forEach((entry) => { 
    console.log(`性能记录: ${entry.name} - ${entry.duration.toFixed(2)}ms`)
  })
})

perfObserver.observe({entryTypes: ['measure']})

export default function (options: VitePluginCondensationOption = {}): Plugin {
  let outputPath: string
  let config: ResolvedConfig

  let totalStartTime = 0

  const emptyPlugin: Plugin = {
    name: 'vite:condensation'
  }

  const {
    verbose = true,
    filter = defaultRE,
    outputName,
    algorithm,
    disabled,
    threshold = 1025,
    condensationOptions,
    deleteOriginFile = false,
    enableTiming = true,
    logTimingDetails = false,
    timingThreshold = 0,
    success = () => { }
  } = options

  let { ext = '' } = options

  if (algorithm === 'gzip' && !ext) ext = '.gz'

  if (algorithm === 'brotliCompress' && !ext) ext = '.br'
  

  if(disabled) return emptyPlugin

  return {
    ...emptyPlugin,
    apply: 'build',
    enforce: 'post',
    configResolved(resolvedConfig) {
      config = resolvedConfig
      outputPath = isAbsolute(config.build.outDir) ? config.build.outDir : join(config.root, config.build.outDir)
      console.log('resolvedConfig', resolvedConfig);
    },
    closeBundle() {
      if (enableTiming) { 
        totalStartTime = performance.now()
        performance.mark('plugin-start')
      }

      if (enableTiming) { 
        performance.mark('readfile-start')
      }

      let files = readAllFile(outputPath) || []

      if (enableTiming) { 
        performance.mark('readfile-end');
        performance.measure('读取文件', 'readfile-start', 'readfile-end')
      }

      if (!files?.length) return;

      if (enableTiming) { 
        performance.mark('filter-start')
      }

      files = filterFiles(files, filter)

      if (enableTiming) { 
        performance.mark('filter-end')
        performance.measure('文件过滤', 'filter-start', 'filter-end')
      }

      const options = getCondensationOptions(algorithm, condensationOptions)

      console.log('options -> ', options);
      
      const condensationMap = new Map<string, {
        size: number;
        oldSize: number;
        cname: string
      }>()

      const handles = files.map(async (filePath: string) => { 
        const { mtimeMs, size: oldSize } = await stat(filePath)
        if(mtimeMs <= (mtimeCache.get(filePath) || 0) || oldSize < threshold) return
        
        let content = await readFile(filePath)

        if (deleteOriginFile) remove(filePath)
        
        try {
          content = await condense(content, algorithm as any, condensationOptions) as any
        } catch (error) {
          config.logger.error('condense error: ' + filePath)
        }

        const size = content.byteLength

        const cname = getOutputFileName(outputName ?? filePath, ext)
        condensationMap.set(filePath, {
          size: size / 1024,
          oldSize: oldSize / 1024,
          cname
        })

        await writeFile(cname, content)

        mtimeCache.set(filePath, Date.now())
      })

      return Promise.all(handles).then(() => { 
        if (verbose) {
          if (enableTiming) { 
            performance.mark('plugin-end')
            performance.measure('插件总耗时', 'plugin-start', 'plugin-end')
          }
          success()
        }
      })
    }
  }
}

function filterFiles(files: string[], filter: RegExp | ((file: string) => boolean)) {
  if (filter) { 
    const isRe = isRegExp(filter)
    const isFn = isFunction(filter)

    files = files.filter((file) => { 
      if (isRe) { 
        return (filter as RegExp).test(file)
      }
      if (isFn) { 
        return (filter as Function)(file)
      }
      return true
    })
  } 
  
  return files
}

function getCondensationOptions(algorithm = '', options: CondensationOptions = {}) {
  const defaultOptions: {
    [key: string]: Record<string, any>
  } = {
    gzip: {
      level: zlib.constants.Z_BEST_COMPRESSION
    },
    deflate: {
      level: zlib.constants.Z_BEST_COMPRESSION
    },
    deflateRaw: {
      level: zlib.constants.Z_BEST_COMPRESSION
    },
    brotliCompress: {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT
      }
    }
  }

  return {
    ...defaultOptions?.[algorithm],
    ...options
  } as CondensationOptions
}

function getOutputFileName(filePath: string, ext: string) {
  const outputExt = ext.startsWith('.') ? ext : `.${ext}`
  return `${filePath}${outputExt}`
}

function condense(
  content: Buffer,
  algorithm: Algorithm,
  options: CondensationOptions = {}
) {
  return new Promise<Buffer>((resolve, reject) => {
    // @ts-ignore
    zlib[algorithm](content, options, (err, result) => err ? reject(err) : resolve(result))
  })
}