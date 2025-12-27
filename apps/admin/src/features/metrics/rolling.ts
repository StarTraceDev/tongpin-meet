/** 实时曲线只在页面上攒点，留最近 max 个采样 */
export function appendSample<T>(buffer: readonly T[], sample: T, max = 60): T[] {
  const next = [...buffer, sample]
  return next.length > max ? next.slice(next.length - max) : next
}
