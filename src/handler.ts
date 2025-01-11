import type { IReqOptions, PicGo } from 'picgo'
import type { AlistResponse, UserConfig } from './types'
import { bedName } from './config'
import { getPostOptions, getRefreshOptions } from './option'
import { rmBothEndSlashes, rmEndSlashes } from './utils/index'

type IImageInfo = PicGo['output'][0]

interface SingleUploadOptions {
  url: string
  token: string
  uploadPath: string
  accessPath: string
  version: number
}

function handleFileName(fileName: string) {
  const fileNameParts = fileName.split('/')
  return {
    fileName: fileNameParts[fileNameParts.length - 1],
    prefixPath: fileNameParts.slice(0, -1).join('/'),
  }
}

async function handleSingleUpload(
  ctx: PicGo,
  image: IImageInfo,
  options: SingleUploadOptions,
): Promise<void> {
  const { url, token, uploadPath: originalUploadPath, accessPath: originalAccessPath, version } = options

  const handledFileName = handleFileName(image.fileName)

  const fileName = handledFileName.fileName
  const uploadPath = handledFileName.prefixPath ? `${originalUploadPath}/${handledFileName.prefixPath}` : originalUploadPath
  const accessPath = handledFileName.prefixPath ? `${originalAccessPath}/${handledFileName.prefixPath}` : originalAccessPath

  ctx.log.info(`[信息] version:${version}, uploadPath:${uploadPath}, fileName:${fileName}`)

  // 上传文件
  const postOptions = getPostOptions({
    url,
    token,
    uploadPath,
    files: image.buffer,
    version,
    fileName,
  })

  ctx.log.info(`[开始上传] ${image.fileName}`)
  const uploadRes = await ctx.request<AlistResponse, IReqOptions>(postOptions)

  if (uploadRes.status !== 200)
    throw new Error(`[上传失败] 文件: ${fileName} 结果: ${uploadRes.statusCode} ${uploadRes.statusText}`)

  if (!uploadRes.data || uploadRes.data.code !== 200)
    throw new Error(`[上传失败] 文件: ${fileName} 结果: ${JSON.stringify(uploadRes.data)}`)

  ctx.log.info(`[上传请求结果] ${JSON.stringify(uploadRes.data)}`)

  // 刷新目录
  const refreshOptions = getRefreshOptions({ url, uploadPath, version, token })
  const refreshRes = await ctx.request<AlistResponse, IReqOptions>(refreshOptions)

  if (refreshRes.status !== 200)
    throw new Error(`[刷新失败] ${refreshRes.statusCode} ${refreshRes.statusText}`)

  if (!refreshRes.data || refreshRes.data.code !== 200)
    throw new Error(`[刷新失败] ${JSON.stringify(refreshRes.data)}`)

  ctx.log.info(`[刷新请求结果] ${JSON.stringify({ code: refreshRes.data.code, message: refreshRes.data.message })}`)

  image.imgUrl = `${url}/d/${accessPath}/${fileName}`
  delete image.base64Image
  delete image.buffer
}

export async function handle(ctx: PicGo): Promise<PicGo> {
  const userConfig: UserConfig = ctx.getConfig(bedName)
  if (!userConfig)
    throw new Error('找不到上传器配置')

  const options = {
    url: rmEndSlashes(userConfig.url),
    token: userConfig.token,
    uploadPath: rmBothEndSlashes(userConfig.uploadPath),
    accessPath: userConfig.accessPath
      ? rmBothEndSlashes(userConfig.accessPath)
      : rmBothEndSlashes(userConfig.uploadPath),
    version: Number(userConfig.version),
  }

  const uploads = ctx.output.map(async (image) => {
    try {
      await handleSingleUpload(ctx, image, options)
    }
    catch (error) {
      ctx.log.error(error)
      ctx.emit('notification', {
        title: '上传失败',
        body: error.message,
      })
    }
  })

  await Promise.all(uploads)
  return ctx
}
