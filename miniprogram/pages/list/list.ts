// list.ts —— 展品列表页
import { getAllExhibits } from '../../services/exhibit'
import { Exhibit } from '../../models/exhibit'

Component({
  data: {
    list: [] as Exhibit[],
  },
  methods: {
    async onLoad() {
      wx.showLoading({ title: '加载中' })
      try {
        const list = await getAllExhibits()
        this.setData({ list })
      } catch (e) {
        wx.showToast({ title: '加载失败，请重试', icon: 'none' })
      } finally {
        wx.hideLoading()
      }
    },

    // 点击卡片进入详情
    onTapExhibit(e: WechatMiniprogram.TouchEvent) {
      const id = e.currentTarget.dataset.id as string
      wx.navigateTo({ url: `/pages/exhibit/exhibit?id=${id}` })
    },
  },
})
