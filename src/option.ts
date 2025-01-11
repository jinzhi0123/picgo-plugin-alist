import type { IReqOptions } from 'picgo'
import type { PostOptions, RefreshOptions } from './types'
import FormData from 'form-data'

export function getRefreshOptions(options: RefreshOptions): IReqOptions {
  const { url, token, uploadPath, version } = options
  if (version === 2) {
    const v2options: IReqOptions = {
      method: 'POST',
      url: `${url}/api/admin/refresh`,
      resolveWithFullResponse: true,
      headers: {
        'User-Agent': 'PicGo',
        'Authorization': token,
      },
      data: {
        path: `/${uploadPath}`,
      },
    }
    return v2options
  }
  else if (version === 3) {
    const v3options: IReqOptions = {
      method: 'POST',
      url: `${url}/api/fs/list`,
      resolveWithFullResponse: true,
      headers: {
        'User-Agent': 'PicGo',
        'Authorization': token,
      },
      data: {
        page: 1,
        password: '',
        path: `/${uploadPath}`,
        per_page: 0,
        refresh: true,
      },
    }
    return v3options
  }
}

export function getPostOptions(options: PostOptions): IReqOptions {
  const { url, files, token, uploadPath, version, fileName } = options
  if (version === 2) {
    const formData = new FormData()
    formData.append('files', files, {
      filename: fileName,
    })
    formData.append('path', uploadPath)

    const v2options: IReqOptions = {
      method: 'POST',
      url: `${url}/api/public/upload`,
      resolveWithFullResponse: true,
      headers: {
        'User-Agent': 'PicGo',
        'Authorization': token,
      },
      data: formData,
    }
    return v2options
  }
  else if (version === 3) {
    const formData = new FormData()
    formData.append('file', files, {
      filename: fileName,
    })

    const v3options: IReqOptions = {
      method: 'PUT',
      url: `${url}/api/fs/form`,
      resolveWithFullResponse: true,
      headers: {
        'User-Agent': 'PicGo',
        'Authorization': token,
        'file-path': encodeURIComponent(`/${uploadPath}/${fileName}`),
      },
      data: formData,
    }
    return v3options
  }
}
