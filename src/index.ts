import type { IPluginConfig, PicGo } from 'picgo'
import type { PostOptions, RefreshOptions, UserConfig } from './types'
import { bedName, getConfig, uploaderName } from './config'
import { handle } from './handler'

export = (ctx: PicGo) => {
  const register = () => {
    ctx.helper.uploader.register(uploaderName, {
      handle,
      name: 'alist',
      config: getConfig,
    })
  }
  return {
    uploader: uploaderName,
    register,
  }
}
