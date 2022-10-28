export const rmEndSlashes = (str: string) => {
  return str?.replace(/\/*\\*$/gi, '')
}

export const rmBeginSlashes = (str: string) => {
  return str?.replace(/^\/*\\*/gi, '')
}

export const rmBothEndSlashes = (str: string) => {
  return rmBeginSlashes(rmEndSlashes(str))
}
