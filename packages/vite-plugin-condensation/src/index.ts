import type { Plugin, ResolvedConfig } from 'vite'
import { isAbsolute, join } from 'node:path'
import Debug from 'debug'
import { readAllFile } from './utils'

const debug = Debug.debug('vite-plugin-condensation')

export default function (): Plugin {
  let outputPath: string
  let config: ResolvedConfig

  const emptyPlugin: Plugin = {
    name: 'vite:condensation'
  }

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
      let files = readAllFile(outputPath) || []
      console.log('files:', files)
    }
  }
}