import type { Buffer } from 'node:buffer'
import type { Stream } from 'node:stream'

export type UserConfig = {
  version: string | number
  url: string
  username: string
  password: string
  token: string
  uploadPath: string
  accessPath?: string
  accessDomain?: string
  accessFileNameTemplate?: string
} & {
  [K in keyof InternalConfig as `sys_${string & K}`]: InternalConfig[K]
}

export interface InternalConfig {
  token?: string
  tokenRefreshedAt: string
}

export interface PostOptions {
  url: string
  uploadPath: string
  token: string
  files: Stream | Buffer
  version: number
  fileName?: string
}

export interface RefreshOptions {
  url: string
  token: string
  version: number
  uploadPath: string
}

export interface Files {
  value: Stream
  options: {
    fileName: string
  }
}

export interface AlistResponse<T = any> {
  code: number
  message: string
  data: T
}
