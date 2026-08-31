// index.ts —— 博物馆讲解首页
import { getExhibitById } from '../../services/exhibit'

// 从扫码文本中解析展品编号。
// 后台「普通二维码」编码的是一句提示语 + 「展品编号：xxx」，通用扫码器会显示提示语，
// 小程序内扫码则从中提取编号。兼容旧二维码（内容即纯编号）。
function parseExhibitId(raw: string): string {
  const s = (raw || '').trim()
  const m = s.match(/展品编号[:：]\s*([A-Za-z0-9_-]+)/)
  return m ? m[1] : s
}

Component({
  methods: {
    // 点击「扫一扫」
    onScan() {
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
