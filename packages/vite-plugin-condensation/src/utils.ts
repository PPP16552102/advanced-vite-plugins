import { existsSync, lstatSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const isFunction = (arg: unknown): arg is (...args: any[]) => any => typeof arg === 'function' 

export function readAllFile(root: string, reg?: RegExp): string[] {
  let ret: string[] = []
  try {
    if (existsSync(root)) { 
      const stat = lstatSync(root)
      if (stat.isDirectory()) {
        const files = readdirSync(root)
        files.forEach((file) => {
          const t = readAllFile(join(root, '/', file), reg)
          ret = ret.concat(t)
        })
      } else { 
        if (reg !== undefined) {
          if (isFunction(reg.test) && reg.test(root)) ret.push(root)
        } else { 
          ret.push(root)
        }
      }
    }
  } catch (error) {
    throw error
  }

  return ret
}