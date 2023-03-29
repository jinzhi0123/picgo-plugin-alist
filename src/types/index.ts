import type { Stream } from 'stream'
export interface UserConfig {
  version: string | number
  url: string
  token: string
  path: string
  path_prefix: string
}

export interface PostOptions {
  url: string
  path: string
  token: string
  files: Stream
  version: number
  fileName?: string
}

export interface RefreshOptions {
  url: string
  token: string
  version: number
  path: string
}

export interface Files {
  value: Stream
  options: {
    fileName: string
  }
}
