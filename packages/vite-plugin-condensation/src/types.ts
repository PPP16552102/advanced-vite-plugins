import { BrotliOptions, ZlibOptions } from "node:zlib"

export type Algorithm = 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw'

export type CondensationOptions = Partial<ZlibOptions> | Partial<BrotliOptions>

export interface VitePluginCondensationOption {
  verbose?: boolean
  threshold?: number
  disabled?: boolean
  outputName?: string
  ext?: string
  condensationOptions?: CondensationOptions
  deleteOriginFile?: boolean
  algorithm?: Algorithm
  filter?: RegExp | ((file: string) => boolean),
  enableTiming?: boolean
  logTimingDetails?: boolean
  timingThreshold?: number
  success?: () => void
}