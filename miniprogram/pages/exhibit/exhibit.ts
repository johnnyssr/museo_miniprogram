import { getExhibitById } from '../../services/exhibit'
import { Exhibit } from '../../models/exhibit'
import { markVisited } from '../../utils/visitHistory'
import { scanToExhibit } from '../../utils/scan'

const FONT_SIZES = [24, 28, 34]
const FOLD_LEN = 200

Component({
  data: {
    id: '',
    exhibit: null as Exhibit | null,
    notFound: false,
    loadFailed: false,
    imageIndex: 0,
    activeTab: 'text',
    textLong: false,
    textShort: '',
    textExpanded: false,
    fontSize: 28,
    videoOpen: false,
    videoFailed: false,
    videoPending: false,
    videoRequest: 0,
  },

  methods: {
    onLoad(query: Record<string, string>) {
      const id = (query.id || decodeURIComponent(query.scene || '')).trim()
      const saved = wx.getStorageSync('exhibit_font_size')
      this.setData({ id, fontSize: FONT_SIZES.includes(saved) ? saved : 28 })
      return this.loadExhibit()
    },

    async loadExhibit() {
      this.setData({ loadFailed: false })
      wx.showLoading({ title: '加载中' })
      try {
        const exhibit = await getExhibitById(this.data.id)
        if (!exhibit) {
          this.setData({ notFound: true })
          return
        }
        const body = (exhibit.text || '').trim()
        this.setData({
          exhibit: { ...exhibit, text: body },
          activeTab: !body && !exhibit.images.length && exhibit.videoUrl ? 'video' : 'text',
          textLong: body.length > FOLD_LEN,
          textShort: body.length > FOLD_LEN ? body.slice(0, FOLD_LEN) + '…' : body,
        })
        markVisited(this.data.id)
        wx.showShareMenu({ withShareTicket: false, menus: ['shareAppMessage', 'shareTimeline'] })
      } catch {
        this.setData({ loadFailed: true })
      } finally {
        wx.hideLoading()
      }
    },

    onImageChange(e: WechatMiniprogram.SwiperChange) {
      this.setData({ imageIndex: e.detail.current })
    },

    onPreviewImage(e: WechatMiniprogram.TouchEvent) {
      const urls = this.data.exhibit?.images || []
      if (urls.length) wx.previewImage({ current: e.currentTarget.dataset.src || urls[this.data.imageIndex], urls })
    },

    toggleText() {
      this.setData({ textExpanded: !this.data.textExpanded })
    },

    chooseFont() {
      const sizes = ['小', '标准', '大']
      wx.showActionSheet({
        itemList: sizes.map((label, i) => label + (FONT_SIZES[i] === this.data.fontSize ? '（当前）' : '')),
        success: ({ tapIndex }) => {
          const fontSize = FONT_SIZES[tapIndex]
          this.setData({ fontSize })
          wx.setStorageSync('exhibit_font_size', fontSize)
        },
      })
    },

    selectTab(e: WechatMiniprogram.TouchEvent) {
      const activeTab = e.currentTarget.dataset.tab
      if (activeTab === this.data.activeTab) return
      this.cancelVideoRequest()
      this.setData({ activeTab, videoOpen: false })
    },

    cancelVideoRequest() {
      if (this.data.videoPending) {
        this.setData({ videoRequest: this.data.videoRequest + 1, videoPending: false })
      }
    },

    async requestVideo() {
      if (this.data.videoPending || this.data.videoOpen) return
      const request = this.data.videoRequest + 1
      this.setData({ videoRequest: request, videoPending: true })
      try {
        const network = await wx.getNetworkType().catch(() => undefined)
        if (request !== this.data.videoRequest) return
        if (network && network.networkType !== 'wifi') {
          const { confirm } = await wx.showModal({
            title: '使用移动网络播放？',
            content: '当前未连接 Wi-Fi，观看视频可能消耗移动流量。',
            confirmText: '继续播放',
          })
          if (!confirm || request !== this.data.videoRequest) return
        }
        this.pauseNarration()
        this.setData({ videoOpen: true, videoFailed: false })
      } catch {
        if (request === this.data.videoRequest) {
          wx.showToast({ title: '暂时无法播放，请重试', icon: 'none' })
        }
      } finally {
        if (request === this.data.videoRequest) this.setData({ videoPending: false })
      }
    },

    pauseNarration() {
      this.selectComponent('#narration')?.pause()
    },

    onAudioRequest() {
      this.cancelVideoRequest()
      this.pauseVideo()
    },

    pauseVideo() {
      if (this.data.videoOpen) wx.createVideoContext('exhibit-video', this).pause()
    },

    onVideoError() {
      this.setData({ videoOpen: false, videoFailed: true })
      wx.showToast({ title: '视频加载失败，请重试', icon: 'none' })
    },

    onHide() {
      this.cancelVideoRequest()
      this.pauseVideo()
    },

    onUnload() {
      this.cancelVideoRequest()
    },

    goList() {
      wx.reLaunch({ url: '/pages/list/list' })
    },

    onScan() {
      scanToExhibit()
    },

    onShareAppMessage() {
      const e = this.data.exhibit
      return {
        title: e ? e.name + '——北部湾海洋生态守护站' : '北部湾海洋生态守护站讲解',
        imageUrl: e?.image || '',
        path: e ? '/pages/exhibit/exhibit?id=' + e.id : '/pages/index/index',
      }
    },

    onShareTimeline() {
      const e = this.data.exhibit
      return {
        title: e ? e.name + '——北部湾海洋生态守护站' : '北部湾海洋生态守护站讲解',
        imageUrl: e?.image || '',
        query: e ? 'id=' + e.id : '',
      }
    },
  },
})
