// utils/scan.ts —— 扫码解析 + 跳转展品详情（首页与列表页共用）
import { getExhibitById } from '../services/exhibit'

// 从扫码文本中解析展品编号。
// 后台「普通二维码」编码的是一句提示语 + 「展品编号：xxx」，通用扫码器显示提示语，
// 小程序内扫码则从中提取编号。兼容旧二维码（内容即纯编号）。
export function parseExhibitId(raw: string): string {
  const s = (raw || '').trim()
  const m = s.match(/展品编号[:：]\s*([A-Za-z0-9_-]+)/)
  return m ? m[1] : s
}

// 调起扫码并跳转到对应展品详情；无效 / 未找到时 toast，用户取消静默。
export function scanToExhibit(): void {
  wx.scanCode({
    success: async (res) => {
      const id = parseExhibitId(res.result || '')
      if (!id) {
        wx.showToast({ title: '无效的二维码', icon: 'none' })
        return
      }
      const exhibit = await getExhibitById(id)
      if (!exhibit) {
        wx.showToast({ title: '未找到该展品', icon: 'none' })
        return
      }
      // 若当前已在展品详情页（“继续扫码”场景），用 redirectTo 替换，避免逐件压栈超出页面栈上限
      const pages = getCurrentPages()
      const onExhibit = pages[pages.length - 1]?.route === 'pages/exhibit/exhibit'
      const url = `/pages/exhibit/exhibit?id=${id}`
      ;(onExhibit ? wx.redirectTo : wx.navigateTo)({ url })
    },
    fail: () => {
      // 用户主动取消扫码，静默处理
    },
  })
}
