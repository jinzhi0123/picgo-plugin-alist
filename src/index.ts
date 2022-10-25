import type { Stream } from 'stream'
import fs from 'fs'
import nodePath from 'path'
import type { IPluginConfig, PicGo } from 'picgo'
import temporaryDirectory from 'temp-dir'

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
  version: string | number
  fileName?: string
}

interface Files {
  value: Stream
  options: {
    fileName: string
  }
}

const uploaderName = 'alist'
const bedName = `picBed.${uploaderName}`

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
  }
  switch (Number(version)) {
    case 2:return v2options
    case 3:return v3options
  }
}

const handle = async (ctx: PicGo): Promise<PicGo> => {
  const userConfig: UserConfig = ctx.getConfig(bedName)
  if (!userConfig)
    throw new Error("Can't find uploader config")
  const { url, token, path, version } = userConfig
  const imgList = ctx.output
  for (const i in imgList) {
    try {
      const image = imgList[i].buffer
      const fileName = imgList[i].fileName
      const tempFilePath = nodePath.join(temporaryDirectory, fileName)
      try {
        fs.writeFileSync(tempFilePath, image)
      }
      catch (err) {
        throw new Error(`[缓存文件失败]文件${tempFilePath},${err.message}`)
      }
      ctx.log.info(`[测试]已经写入文件`)
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
        ctx.log.info(`[文件名]${fileName}`)
        ctx.log.info(`[请求结果]${JSON.stringify(res)}`)
        if (res.statusCode !== Number(200))
          throw new Error(`[请求出错]${res}`)
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
      default: userConfig.path ?? '/',
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
