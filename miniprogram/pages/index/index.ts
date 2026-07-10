// index.ts —— 博物馆讲解首页
import { getExhibitById } from '../../services/exhibit'

Component({
  methods: {
    // 点击「扫一扫」
    onScan() {
      wx.scanCode({
        success: (res) => {
          const id = (res.result || '').trim()
          const exhibit = getExhibitById(id)
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
