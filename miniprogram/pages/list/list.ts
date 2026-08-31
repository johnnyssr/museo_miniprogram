// list.ts —— 展品列表页
import { getAllExhibits } from '../../services/exhibit'
import { Exhibit } from '../../models/exhibit'
import { getVisited } from '../../utils/visitHistory'

const CAT_ORDER = ['全部', '鱼类', '珊瑚', '哺乳类', '贝类', '藻类', '其他']

type ExhibitRow = Exhibit & { visited: boolean }

Component({
  data: {
    allList: [] as Exhibit[],
    filteredList: [] as ExhibitRow[],
    categories: [] as string[],
    activeCategory: '全部',
    searchKeyword: '',
    visitedCount: 0,
    totalCount: 0,
  },

  methods: {
    async onLoad() {
      wx.showLoading({ title: '加载中' })
      try {
        const list = await getAllExhibits()
        const usedCats = new Set(list.map((e) => e.category || '其他'))
        const categories = CAT_ORDER.filter((c) => c === '全部' || usedCats.has(c))
        this.setData({ allList: list, categories, totalCount: list.length })
        this._refresh()
      } catch (e) {
        wx.showToast({ title: '加载失败，请重试', icon: 'none' })
      } finally {
        wx.hideLoading()
      }
    },

    onShow() {
      // 从展品页返回时刷新打卡标记（不重新拉数据）
      if (this.data.allList.length) this._refresh()
    },

    onSearchInput(e: WechatMiniprogram.Input) {
      this.setData({ searchKeyword: e.detail.value })
      this._refresh()
    },

    onCategoryTap(e: WechatMiniprogram.TouchEvent) {
      const cat = e.currentTarget.dataset.cat as string
      this.setData({ activeCategory: cat })
      this._refresh()
    },

    onTapExhibit(e: WechatMiniprogram.TouchEvent) {
      const id = e.currentTarget.dataset.id as string
      wx.navigateTo({ url: `/pages/exhibit/exhibit?id=${id}` })
    },

    _refresh() {
      const { allList, searchKeyword, activeCategory } = this.data
      const visited = getVisited()
      let result = allList

      if (activeCategory && activeCategory !== '全部') {
        result = result.filter((e) => (e.category || '其他') === activeCategory)
      }
      if (searchKeyword) {
        const kw = searchKeyword.toLowerCase()
        result = result.filter(
          (e) =>
            e.name.toLowerCase().includes(kw) ||
            (e.summary || '').toLowerCase().includes(kw),
        )
      }

      const filteredList: ExhibitRow[] = result.map((e) => ({
        ...e,
        visited: visited.includes(e.id),
      }))
      const visitedCount = visited.filter((id) => allList.some((e) => e.id === id)).length
      this.setData({ filteredList, visitedCount })
    },
  },
})
