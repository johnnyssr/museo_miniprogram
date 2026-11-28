// index.ts —— 博物馆讲解首页
import { scanToExhibit } from '../../utils/scan'

Component({
  methods: {
    // 点击「扫一扫」
    onScan() {
      scanToExhibit()
    },

    // 点击「浏览全部展品」
    onBrowseAll() {
      wx.navigateTo({ url: '/pages/list/list' })
    },
  },
})
