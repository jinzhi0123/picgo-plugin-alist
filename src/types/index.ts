import type { Stream } from 'stream'
export interface UserConfig {
  version: string | number
  url: string
  token: string
  uploadPath: string
  accessPath: string
}

export interface PostOptions {
  url: string
  uploadPath: string
  token: string
  files: Stream
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
