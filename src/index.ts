import type { Stream } from 'stream'
import fs from 'fs'
import nodePath from 'path'
import type { IPluginConfig, PicGo } from 'picgo'
import temporaryDirectory from 'temp-dir'
import { rmBothEndSlashes, rmEndSlashes } from './utils/index'

interface UserConfig {
  version: string | number
  url: string
  token: string
  path: string
}

interface PostOptions {
  url: string
  path: string
  token: string
  files: Stream
  version: number
  fileName?: string
}

interface RefreshOptions {
  url: string
  token: string
  version: number
  path: string
}

interface Files {
  value: Stream
  options: {
    fileName: string
  }
}

const uploaderName = 'alist'
const bedName = `picBed.${uploaderName}`
const getRefreshOptions = (options: RefreshOptions) => {
  const { url, token, path, version } = options
  const v3options = {
    method: 'POST',
    url: `${url}/api/fs/list`,
    rejectUnauthorized: false,
    // contentType: 'application/json',
    headers: {
      'User-Agent': 'PicGo',
      'Authorization': token,
    },
    body: {
      page: 1,
      password: "",
      path: `/${path}`,
      per_page: 0,
      refresh: true,
    },
    json: true,
  }
  const v2options = {
    method: 'POST',
    url: `${url}/api/admin/refresh`,
    rejectUnauthorized: false,
    contentType: 'application/json',
    headers: {
      'User-Agent': 'PicGo',
      'Authorization': token,
    },
    body: {
      path: `/${path}`,
    },
    json: true,
  }
  switch (version) {
    case 2:return v2options
    case 3:return v3options
  }
}
const getPostOptions = (options: PostOptions) => {
  const { url, files, token, path, version, fileName } = options
  const v2options = {
    method: 'POST',
    url: `${url}/api/public/upload`,
    rejectUnauthorized: false,
    headers: {
      // "Content-Type": 'multipart/form-data',
      'User-Agent': 'PicGo',
      'Authorization': token,
    },
    formData: {
      path,
      files: {
        value: files,
        options: {
          filename: fileName,
        },
      },
    },
    json: true,
  }
  const v3options = {
    method: 'PUT',
    url: `${url}/api/fs/form`,
    rejectUnauthorized: false,
    headers: {
      // "Content-Type": 'multipart/form-data',
      'User-Agent': 'PicGo',
      'Authorization': token,
      'file-path': encodeURIComponent(`/${path}/${fileName}`),
    },
    formData: {
      file: {
        value: files,
        options: {
          filename: fileName,
        },
      },
    },
    json: true,
  }
  switch (version) {
    case 2:return v2options
    case 3:return v3options
  }
}

const handle = async (ctx: PicGo): Promise<PicGo> => {
  const userConfig: UserConfig = ctx.getConfig(bedName)
  if (!userConfig)
    throw new Error("Can't find uploader config")
  let { url, path, version } = userConfig
  const { token } = userConfig
  path = rmBothEndSlashes(path)
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
        imgList[i].imgUrl = `${url}/d/${path}/${imgList[i].fileName}`
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

const getConfig = (ctx: PicGo): IPluginConfig[] => {
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
      message: '填写管理员token，获取请参考alist文档。',
      required: true,
      alias: '管理员token',
    },
  ]
  return config
}

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
