import type { PicGo } from 'picgo'
import { getConfig, uploaderName } from './config'
import { handle } from './handler'

export default (ctx: PicGo) => {
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
