// list.ts —— 展品列表页
import { getAllExhibits } from '../../services/exhibit'
import { Exhibit } from '../../models/exhibit'

Component({
  data: {
    list: [] as Exhibit[],
  },
  methods: {
    onLoad() {
      this.setData({ list: getAllExhibits() })
    },

    // 点击卡片进入详情
    onTapExhibit(e: WechatMiniprogram.TouchEvent) {
      const id = e.currentTarget.dataset.id as string
      wx.navigateTo({ url: `/pages/exhibit/exhibit?id=${id}` })
    },
  },
})
