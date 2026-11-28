// 把 CloudBase / SDK 的原始报错转换为用户友好的中文提示。
// 已知模式归类到友好文案；未识别的错误**保留原始信息**（截断过长的），
// 避免把真实原因完全藏在通用兜底里导致无法排查。
export function friendlyError(err: unknown, fallback = '操作失败，请稍后重试'): string {
  const raw = (err instanceof Error ? err.message : String(err ?? '')).trim()
  if (!raw) return fallback

  const rules: [RegExp, string][] = [
    [/permission|denied|unauthorized|not.*login|auth.*(fail|expire)|登录/i, '没有权限或登录已过期，请重新登录后重试'],
    [/network|timeout|timed ?out|fetch|ECONN|ETIMEDOUT|offline/i, '网络异常，请检查网络后重试'],
    [/exceed|limit|quota|frequency|too many/i, '操作过于频繁或超出配额，请稍后再试'],
  ]
  for (const [re, msg] of rules) if (re.test(raw)) return msg

  // 已是简短中文提示，直接透传（应用层主动抛出的业务错误）
  if (/[一-龥]/.test(raw) && raw.length <= 40) return raw
  // 未识别：保留原始报错（过长则截断），便于定位真实原因
  return raw.length <= 120 ? raw : raw.slice(0, 120) + '…'
}
