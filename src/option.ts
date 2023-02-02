import type { PostOptions, RefreshOptions, UserConfig } from './types'

export const getRefreshOptions = (options: RefreshOptions) => {
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

export const getPostOptions = (options: PostOptions) => {
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
