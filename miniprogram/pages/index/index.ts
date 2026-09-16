// index.ts —— 博物馆讲解首页
import { getExhibitById } from '../../services/exhibit'

// 从扫码结果中解析展品编号。
// 现用「方形小程序二维码」(createwxaqrcode)：小程序内 wx.scanCode 扫到本小程序的合法码时，
// 微信会回传 res.path（形如 pages/exhibit/exhibit?id=xxx），从中取 id 即可。
// 兼容历史「普通二维码」(纯文本，含「展品编号：xxx」)：从 res.result 文本里提取。
function parseExhibitId(res: WechatMiniprogram.ScanCodeSuccessCallbackResult): string {
  // 优先用 path 里的 id（方形小程序二维码走这条）
  const path = res.path || ''
  const q = path.indexOf('?')
  if (q >= 0) {
    const m = path.slice(q + 1).match(/(?:^|&)id=([^&]+)/)
    if (m) return decodeURIComponent(m[1])
  }
  // 回退：从文本内容里解析（兼容旧普通二维码；旧码内容即纯编号时原样返回）
  const s = (res.result || '').trim()
  const t = s.match(/展品编号[:：]\s*([A-Za-z0-9_-]+)/)
  return t ? t[1] : s
}

Component({
  methods: {
    // 点击「扫一扫」
    onScan() {
      wx.scanCode({
        success: async (res) => {
          const id = parseExhibitId(res)
          if (!id) {
            wx.showToast({ title: '无效的二维码', icon: 'none' })
            return
          }
          const exhibit = await getExhibitById(id)
          if (!exhibit) {
            wx.showToast({ title: '未找到该展品', icon: 'none' })
            return
          }
          wx.navigateTo({ url: `/pages/exhibit/exhibit?id=${id}` })
        },
        fail: () => {
          // 用户主动取消扫码，静默处理
        },
      })
    },

    // 点击「浏览全部展品」
    onBrowseAll() {
      wx.navigateTo({ url: '/pages/list/list' })
    },
  },
})
