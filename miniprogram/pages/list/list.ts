// list.ts —— 展品列表页
import { getAllExhibits } from '../../services/exhibit'
import { Exhibit } from '../../models/exhibit'
import { getVisited, takeNewMilestone } from '../../utils/visitHistory'
import { drawAndSaveCheckinCard } from '../../utils/shareCard'
import { scanToExhibit } from '../../utils/scan'

const CAT_ORDER = ['全部', '鱼类', '珊瑚', '哺乳类', '贝类', '藻类', '其他']
const BRAND = '北部湾海洋生态守护站'

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
    percent: 0,
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

    onCardTap(e: WechatMiniprogram.CustomEvent<{ id?: string }>) {
      const id = e.detail.id
      if (id) wx.navigateTo({ url: `/pages/exhibit/exhibit?id=${id}` })
    },

    // 继续扫码：扫下一件展品
    onScan() {
      scanToExhibit()
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
      const total = allList.length
      const visitedCount = visited.filter((id) => allList.some((e) => e.id === id)).length
      const percent = total > 0 ? Math.round((visitedCount * 100) / total) : 0
      this.setData({ filteredList, visitedCount, percent })

      // 达成新里程碑时庆祝（每个里程碑仅一次）
      const milestone = takeNewMilestone(visitedCount, total)
      if (milestone) this._celebrate(milestone)
    },

    _celebrate(pct: number) {
      if (pct >= 100) {
        wx.showModal({
          title: '🎉 全部打卡完成！',
          content: '你已集齐全部展品，成为海洋生态守护者！要生成打卡卡片留作纪念吗？',
          confirmText: '生成卡片',
          cancelText: '稍后',
          success: (r) => {
            if (r.confirm) this.onMakeCard()
          },
        })
      } else {
        wx.showToast({ title: `已打卡 ${pct}%，继续加油！`, icon: 'none' })
      }
    },

    onMakeCard() {
      const { visitedCount, totalCount } = this.data
      this.createSelectorQuery()
        .select('#checkinCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          const node = res && res[0] && res[0].node
          if (!node) {
            wx.showToast({ title: '当前环境不支持生成', icon: 'none' })
            return
          }
          drawAndSaveCheckinCard(node, {
            brand: BRAND,
            visited: visitedCount,
            total: totalCount,
          }).catch(() => {
            /* 失败提示已在工具内处理 */
          })
        })
    },

    onShareAppMessage() {
      return { title: `${BRAND}讲解`, path: '/pages/list/list' }
    },

    onShareTimeline() {
      return { title: `${BRAND}讲解` }
    },
  },
})
