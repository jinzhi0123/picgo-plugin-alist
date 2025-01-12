import type { IPluginConfig, PicGo } from 'picgo'
import type { InternalConfig, UserConfig } from './types'

export const uploaderName = 'alist'
export const bedName = `picBed.${uploaderName}`

export function getConfig(ctx: PicGo): IPluginConfig[] {
  let userConfig: UserConfig = ctx.getConfig(bedName)
  if (!userConfig) {
  // throw new Error("Can't find uploader config")
    userConfig = <any>{}
  }

  const config: IPluginConfig[] = [
    {
      name: 'version',
      type: 'input',
      default: userConfig.version ?? '',
      message: '你的alist版本，2或3',
      required: true,
      alias: 'alist版本',
    },
    {
      name: 'url',
      type: 'input',
      default: userConfig.url ?? '',
      message: '你的alist地址，如https://alist.example.com。',
      required: true,
      alias: 'alist地址',
    },
    {
      name: 'uploadPath',
      type: 'input',
      default: userConfig.uploadPath ?? '',
      message: '上传的相对路径，如assets。',
      required: true,
      alias: '上传路径',
    },
    {
      name: 'token',
      type: 'password',
      default: userConfig.token ?? '',
      message: '填写用户token，获取请参考alist文档。',
      required: false,
      alias: '用户token',
    },
    {
      name: 'username',
      type: 'input',
      default: userConfig.username ?? '',
      message: '填写用户名，与用户token二选一。',
      required: false,
      alias: '用户名',
    },
    {
      name: 'password',
      type: 'password',
      default: userConfig.password ?? '',
      message: '填写密码，与用户token二选一。',
      required: false,
      alias: '密码',
    },
    {
      name: 'accessPath',
      type: 'input',
      default: userConfig.accessPath ?? '',
      message: '若留空，则访问路径与上传路径一致。',
      required: false,
      alias: '访问路径',
    },
    {
      name: 'accessDomain',
      type: 'input',
      default: userConfig.accessDomain ?? '',
      message: '自定义访问域名，若留空，则与alist地址一致。',
      required: false,
      alias: '访问域名',
    },
    {
      name: 'accessFileNameTemplate',
      type: 'input',
      default: userConfig.accessFileNameTemplate ?? '',
      message: `用于alist会重映射文件名的情况，详见github页面。例：prefix_$\{fileName\}_suffix`,
      required: false,
      alias: '访问文件名模板',
    },
  ]
  return config
}

type SetConfigOptions = SetConfigSetOptions | SetConfigAddOptions

interface SetBaseConfigOptions {
  save?: boolean
  action?: 'set' | 'add'
  internal?: boolean
}

interface SetConfigSetOptions extends SetBaseConfigOptions {
  action: 'set'
  internal: false
}

interface SetConfigAddOptions extends SetBaseConfigOptions {
  action: 'add'
  internal: boolean
}

const defaultOptions: SetBaseConfigOptions = {
  save: false,
}

export function setConfig(ctx: PicGo, configs: Record<string, any>, options?: SetConfigOptions): void {
  const originalConfig: UserConfig = ctx.getConfig(bedName)

  const { save, action, internal } = { ...defaultOptions, ...options }

  let newConfig: any
  if (action === 'set') {
    newConfig = { ...configs }
  }
  else if (action === 'add') {
    if (internal) {
      newConfig = { ...originalConfig, ...Object.fromEntries(
        Object.entries(configs).map(([key, value]) => [`sys_${key}`, value]),
      ) }
    }
    else {
      newConfig = { ...originalConfig, ...configs }
    }
  }

  if (save) {
    ctx.saveConfig({
      [bedName]: newConfig,
    })
  }
  else {
    ctx.setConfig({
      [bedName]: newConfig,
    })
  }
}

export function setToken(ctx: PicGo, token: string, refreshedAt: number): void {
  setConfig(ctx, { token, tokenRefreshedAt: String(refreshedAt) }, { save: true, action: 'add', internal: true })
}

export function getToken(ctx: PicGo) {
  const token: string = ctx.getConfig(`${bedName}.sys_token`)
  const refreshedAt: string = ctx.getConfig(`${bedName}.sys_tokenRefreshedAt`)
  return {
    token,
    refreshedAt: Number(refreshedAt),
  }
}
