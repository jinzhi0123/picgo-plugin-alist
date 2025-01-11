export function rmEndSlashes(str: string) {
  return str?.replace(/\/*\\*$/g, '')
}

export function rmBeginSlashes(str: string) {
  return str?.replace(/^\/*\\*/g, '')
}

export function rmBothEndSlashes(str: string) {
  return rmBeginSlashes(rmEndSlashes(str))
}
