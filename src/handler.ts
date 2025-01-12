import type { IReqOptions, PicGo } from 'picgo'
import type { AlistResponse, UserConfig } from './types'
import { bedName, getToken, setToken } from './config'
import { getPostOptions, getRefreshOptions } from './option'
import { rmBothEndSlashes, rmEndSlashes } from './utils/index'

type IImageInfo = PicGo['output'][0]

const UPLOAD_AUTH_RETRY_LIMIT_TIMES = 1

interface SingleUploadOptions {
  url: string
  token: string
  uploadPath: string
  accessPath: string
  version: number
  accessDomain: string
  accessFileNameTemplate?: string
  authMode: 'token' | 'username-password'
  password?: string
  username?: string
}

interface AccessFileNameTemplateVars {
  fileName: string
}

function parseAccessFileNameTemplate(template: string, vars: AccessFileNameTemplateVars): string {
  const fileNameParts = vars.fileName.split('.')
  const extension = fileNameParts.length > 1 ? `.${fileNameParts.pop()}` : ''
  const nameWithoutExt = fileNameParts.join('.')

  let result = template.replace(/\$\{fileName\}/g, nameWithoutExt)

  if (extension) {
    result += extension
  }

  return result
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
  const { url, token: originalToken, uploadPath: originalUploadPath, accessPath: originalAccessPath, version, accessDomain, accessFileNameTemplate } = options

  const handledFileName = handleFileName(image.fileName)

  const fileName = handledFileName.fileName
  const uploadPath = handledFileName.prefixPath ? `${originalUploadPath}/${handledFileName.prefixPath}` : originalUploadPath
  const accessPath = handledFileName.prefixPath ? `${originalAccessPath}/${handledFileName.prefixPath}` : originalAccessPath
  const accessFileName = accessFileNameTemplate ? parseAccessFileNameTemplate(accessFileNameTemplate, { fileName }) : fileName

  ctx.log.info(`[信息] version:${version}, uploadPath:${uploadPath}, fileName:${fileName}`)

  ctx.log.info(`[开始上传] ${image.fileName}`)
  let retryTimes = 0
  let token = originalToken

  while (retryTimes <= UPLOAD_AUTH_RETRY_LIMIT_TIMES) {
    // 上传文件
    const postOptions = getPostOptions({
      url,
      token,
      uploadPath,
      files: image.buffer,
      version,
      fileName,
    })

    ctx.log.info(`[开始上传] ${image.fileName} 第${retryTimes + 1}次尝试`)
    const uploadRes = await ctx.request<AlistResponse, IReqOptions>(postOptions)
    const authFailed = uploadRes.status === 401 || (uploadRes.status === 200 && uploadRes.data.code === 401)
    // 处理401认证失败的情况
    if (authFailed && options.authMode === 'username-password' && retryTimes < UPLOAD_AUTH_RETRY_LIMIT_TIMES) {
      ctx.log.warn(`[认证失败] 正在尝试重新获取token (${retryTimes + 1}/${UPLOAD_AUTH_RETRY_LIMIT_TIMES})`)
      token = await getTokenByAuth(ctx, url, options.username, options.password, { forceRefresh: true })
      retryTimes++
      continue
    }

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

    const targetImgUrl = `${accessDomain}/d/${accessPath}/${accessFileName}`

    image.imgUrl = targetImgUrl

    ctx.log.info(`[上传成功] ${image.fileName} -> ${targetImgUrl}`)

    delete image.base64Image
    delete image.buffer

    break
  }
}

interface GetTokenByAuthOptions {
  forceRefresh?: boolean
}

async function getTokenByAuth(ctx: PicGo, url: string, username: string, password: string, options?: GetTokenByAuthOptions) {
  const storedToken = getToken(ctx)
  if (!options?.forceRefresh && storedToken?.token && storedToken?.refreshedAt && storedToken?.refreshedAt > Date.now() - 1000 * 60 * 60 * 24 * 1) {
    ctx.log.info('[信息] 从缓存中获取token')
    return storedToken.token
  }

  const refreshedAt = Date.now()
  ctx.log.info('[信息] 尝试使用用户名和密码请求API获取token')
  const res = await ctx.request<AlistResponse, IReqOptions>({
    method: 'POST',
    url: `${url}/api/auth/login`,
    resolveWithFullResponse: true,
    data: {
      username,
      password,
    },
  })
  if (res.status !== 200 || !res.data || res.data.code !== 200) {
    throw new Error(`[获取token失败] 请检查用户名和密码是否正确。 状态码： ${res.statusCode} ${res.statusText}`)
  }

  const token: string = res.data.data.token
  setToken(ctx, token, refreshedAt)

  return token
}

export async function handle(ctx: PicGo): Promise<PicGo> {
  const userConfig: UserConfig = ctx.getConfig(bedName)
  if (!userConfig)
    throw new Error('找不到上传器配置')

  if (!userConfig.token && (!userConfig.username || !userConfig.password)) {
    throw new Error('请填写用户名和密码或者token')
  }

  let token: string
  const authMode = userConfig.username && userConfig.password ? 'username-password' : 'token'
  if (authMode === 'username-password') {
    ctx.log.info('[信息] 用户名与密码模式')
    token = await getTokenByAuth(ctx, userConfig.url, userConfig.username, userConfig.password)
  }
  else {
    token = userConfig.token
  }

  const options: SingleUploadOptions = {
    url: rmEndSlashes(userConfig.url),
    token,
    uploadPath: rmBothEndSlashes(userConfig.uploadPath),
    accessPath: userConfig.accessPath
      ? rmBothEndSlashes(userConfig.accessPath)
      : rmBothEndSlashes(userConfig.uploadPath),
    version: Number(userConfig.version),
    accessDomain: userConfig.accessDomain
      ? rmBothEndSlashes(userConfig.accessDomain)
      : rmBothEndSlashes(userConfig.url),
    accessFileNameTemplate: userConfig.accessFileNameTemplate,
    authMode,
    username: userConfig.username,
    password: userConfig.password,
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
