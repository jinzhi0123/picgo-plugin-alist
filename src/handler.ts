import nodePath from 'path'
import fs from 'fs'
import type { PicGo } from 'picgo'
import temporaryDirectory from 'temp-dir'
import { rmBothEndSlashes, rmEndSlashes } from './utils/index'
import { bedName } from './config'
import type { PostOptions, RefreshOptions, UserConfig } from './types'
import { getPostOptions, getRefreshOptions } from './option'

export const handle = async (ctx: PicGo): Promise<PicGo> => {
  const userConfig: UserConfig = ctx.getConfig(bedName)
  if (!userConfig)
    throw new Error("Can't find uploader config")
  let { url, path, version, path_prefix } = userConfig
  const { token } = userConfig
  path = rmBothEndSlashes(path)
  path_prefix = rmBothEndSlashes(path_prefix)
  url = rmEndSlashes(url)
  version = Number(version)
  const imgList = ctx.output
  for (const i in imgList) {
    try {
      const image = imgList[i].buffer
      const fileName = imgList[i].fileName
      const tempFilePath = nodePath.join(temporaryDirectory, fileName)
      ctx.log.info(`[信息]\{version:${version},path:${path},fileName:${fileName}\}`)
      try {
        fs.writeFileSync(tempFilePath, image)
      }
      catch (err) {
        throw new Error(`[缓存文件失败]文件${tempFilePath},${err.message}`)
      }
      ctx.log.info(`[信息]已经写入文件${tempFilePath}`)
      const stream = fs.createReadStream(tempFilePath)
      if (!stream)
        throw new Error(`[读取缓存文件失败]文件${tempFilePath}`)
      const postOptions = getPostOptions({
        url,
        token,
        path,
        files: stream,
        version,
        fileName,
      })
      try {
        const res = await ctx.request(postOptions)
        ctx.log.info(`[请求结果]${JSON.stringify(res)}`)
        if (res.code !== Number(200))
          throw new Error(`[请求出错]${JSON.stringify(res)}`)
        imgList[i].imgUrl = `${url}/d${path_prefix ? `/${path_prefix}` : ''}/${path}/${(userConfig.filename_prefix || '') + imgList[i].fileName}`
      }
      catch (err) {
        throw new Error(`[上传操作]异常：${err.message}`)
      }
      finally {
        stream.close()
      }
      try {
        fs.unlinkSync(tempFilePath)
      }
      catch (err) {
        ctx.log.warn(`[删除缓存文件失败]文件${tempFilePath}，程序继续执行,ERROR:${err}`)
      }
      try {
        const refreshOptions = getRefreshOptions({
          url,
          path,
          version,
          token,
        })
        const res = await ctx.request(refreshOptions)
        ctx.log.info(`[刷新请求结果]\{code:${res.code},message:${res.message}\}`)
        if (res.code !== Number(200))
          throw new Error(`[刷新请求出错]${res}`)
      }
      catch (err) {
        throw new Error(`[刷新操作]异常：${err.message}`)
      }
      delete imgList[i].base64Image
      delete imgList[i].buffer
    }
    catch (error) {
      ctx.log.error(error)
      ctx.emit('notification', {
        title: '上传失败',
        body: error.message,
      })
    }
  }
  return ctx
}
