import type { IPluginConfig, PicGo } from 'picgo'
import type { UserConfig } from './types'

export const uploaderName = 'alist'
export const bedName = `picBed.${uploaderName}`

export const getConfig = (ctx: PicGo): IPluginConfig[] => {
  let userConfig: UserConfig = ctx.getConfig(bedName)
  if (!userConfig) {
  // throw new Error("Can't find uploader config")
    userConfig = <any>{}
  }

  const config = [
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
      name: 'path',
      type: 'input',
      default: userConfig.path ?? '',
      message: '上传的相对路径，如assets。',
      required: true,
      alias: '上传路径',
    },
    {
      name: 'token',
      type: 'password',
      default: userConfig.token ?? '',
      message: '填写用户token，获取请参考alist文档。',
      required: true,
      alias: '用户token',
    },
    {
      name: 'path_prefix',
      type: 'input',
      default: userConfig.path_prefix ?? '',
      message: '如果使用的不是管理员token，填写下载直链中的路径前缀',
      required: false,
      alias: '路径前缀',
    },
    {
      name: 'filename_prefix',
      type: 'input',
      default: userConfig.filename_prefix ?? '',
      message: 'Alist自动为文件名添加的前缀（如果有），如web',
      required: false,
      alias: '文件名前缀',
    },
  ]
  return config
}
