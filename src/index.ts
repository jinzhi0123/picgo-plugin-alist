import type { Stream } from 'stream'
import { Duplex, PassThrough, Readable } from 'stream'
import { request } from 'http'
import fs, { ReadStream } from 'fs'
import type { IPluginConfig, PicGo } from 'picgo'

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
    headers: {
      // "Content-Type": 'multipart/form-data',
      'User-Agent': 'PicGo',
      'Authorization': token,
      'file-path': `%2F${path}%2F${fileName}`,
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
  try {
    const imgList = ctx.output
    for (const i in imgList) {
      const image = imgList[i].buffer
      const fileName = imgList[i].fileName
      fs.writeFileSync(`./${fileName}`, image)
      const stream = fs.createReadStream(`./${fileName}`)
      const postOptions = getPostOptions({
        url,
        token,
        path,
        files: stream,
        version,
        fileName,
      })
      fs.rm(`./${fileName}`, (err) => {
        if (err)
          ctx.log.warn("Can't delete")
      })
      try {
        const res = await ctx.request(postOptions)
        ctx.log.info(fileName)
        ctx.log.info(JSON.stringify(res))
        imgList[i].imgUrl = `${url}/d/${path}/${imgList[i].fileName}`
      }
      catch (err) {
        ctx.log.error(`[上传操作]异常：${err.message}`)
        ctx.emit("notification", {
          title: "上传失败",
          body: JSON.stringify(err),
        })
      }
      delete imgList[i].base64Image
      delete imgList[i].buffer
    }
  }
  catch (error) {
    ctx.log.error(error)
    ctx.emit('notification', {
      title: '上传失败',
      body: error.message,
    })
  }
  return ctx
}

const getConfig = (ctx: PicGo): IPluginConfig[] => {
  const userConfig: UserConfig = ctx.getConfig(bedName)
  if (!userConfig) {
  // throw new Error("Can't find uploader config")

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
