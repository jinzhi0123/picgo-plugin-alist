import type { IPluginConfig, PicGo } from 'picgo'
import type { UserConfig } from './types'
import { IConfig } from 'picgo'

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
      message: '填写管理员token，获取请参考alist文档。',
      required: true,
      alias: '管理员token',
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
