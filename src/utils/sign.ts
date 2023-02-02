import { sha256 } from 'js-sha256'
export const getSign = (path: string, token: string, expireTimeStamp: string) => {
  /* in contribution
  * may be deprecated
  */
  const to_sign = `${path}:${expireTimeStamp}`
  const hash = sha256.hmac.create(token)
  hash.update(to_sign)
  // const _sign = encode(hash.toString())
  // const sign = `${_sign}:${expireTimeStamp}`
  const buf = hash.arrayBuffer()
  return `${btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_")}:${expireTimeStamp}`
}

