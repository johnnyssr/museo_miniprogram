// exhibit.ts —— 展品详情页
import { getExhibitById } from '../../services/exhibit'
import { Exhibit } from '../../models/exhibit'
import { markVisited } from '../../utils/visitHistory'

const FONT_SIZES = [24, 28, 34] // rpx: 小/中/大
const FOLD_LEN = 200

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return (m < 10 ? '0' + m : String(m)) + ':' + (s < 10 ? '0' + s : String(s))
}

Component({
  data: {
    exhibit: null as Exhibit | null,
    notFound: false,
    // text
    textLong: false,
    textShort: '',
    textExpanded: false,
    fontSize: 28,
    // audio
    audioExpanded: false,
    audioPlaying: false,
    audioLoading: false,
    audioDuration: 0,
    audioProgress: 0,
    audioDurationFmt: '00:00',
    audioCurrentFmt: '00:00',
    // video
    videoExpanded: false,
  },

  lifetimes: {
    detached() {
      const self = this as any
      if (self._audioCtx) {
        self._audioCtx.destroy()
        self._audioCtx = null
      }
    },
  },

  methods: {
    async onLoad(query: Record<string, string>) {
      const id = (query.id || decodeURIComponent(query.scene || '') || '').trim()

      // 恢复字号偏好
      const saved = wx.getStorageSync('exhibit_font_size') as number | ''
      if (saved && FONT_SIZES.includes(saved)) {
        this.setData({ fontSize: saved })
      }

      wx.showLoading({ title: '加载中' })
      try {
        const exhibit = await getExhibitById(id)
        if (!exhibit) {
          this.setData({ notFound: true })
          return
        }
        const textLong = exhibit.text.length > FOLD_LEN
        this.setData({
          exhibit,
          textLong,
          textShort: textLong ? exhibit.text.slice(0, FOLD_LEN) + '…' : exhibit.text,
        })
        wx.setNavigationBarTitle({ title: exhibit.name })
        markVisited(id)
        wx.showShareMenu({ withShareTicket: false, menus: ['shareAppMessage', 'shareTimeline'] })
      } catch (e) {
        wx.showToast({ title: '加载失败，请重试', icon: 'none' })
      } finally {
        wx.hideLoading()
      }
    },

    onHide() {
      const self = this as any
      if (self._audioCtx && this.data.audioPlaying) {
        self._audioCtx.pause()
        this.setData({ audioPlaying: false })
      }
    },

    // ── 文字介绍 ──────────────────────────────────────
    toggleText() {
      this.setData({ textExpanded: !this.data.textExpanded })
    },

    adjustFont(e: WechatMiniprogram.TouchEvent) {
      const dir = e.currentTarget.dataset.dir as 'up' | 'down'
      const cur = this.data.fontSize
      const idx = FONT_SIZES.indexOf(cur)
      const next = dir === 'up'
        ? FONT_SIZES[Math.min(idx + 1, FONT_SIZES.length - 1)]
        : FONT_SIZES[Math.max(idx - 1, 0)]
      if (next === cur) return
      this.setData({ fontSize: next })
      wx.setStorageSync('exhibit_font_size', next)
    },

    // ── 图片预览 ──────────────────────────────────────
    onPreviewImage(e: WechatMiniprogram.TouchEvent) {
      const current = e.currentTarget.dataset.src as string
      const urls = this.data.exhibit?.images || []
      if (urls.length) wx.previewImage({ current, urls })
    },

    // ── 语音 ──────────────────────────────────────────
    toggleAudio() {
      this.setData({ audioExpanded: !this.data.audioExpanded })
    },

    toggleAudioPlay() {
      const exhibit = this.data.exhibit
      if (!exhibit?.audioUrl) return

      const self = this as any
      if (!self._audioCtx) {
        const ctx = wx.createInnerAudioContext()
        ctx.src = exhibit.audioUrl
        ctx.onCanplay(() => {
          const dur = ctx.duration || 0
          this.setData({ audioLoading: false, audioDuration: dur, audioDurationFmt: fmtTime(dur) })
        })
        ctx.onTimeUpdate(() => {
          const t = ctx.currentTime || 0
          const d = ctx.duration || this.data.audioDuration || 0
          this.setData({
            audioCurrentFmt: fmtTime(t),
            audioProgress: d > 0 ? Math.round((t / d) * 100) : 0,
          })
        })
        ctx.onEnded(() => {
          this.setData({ audioPlaying: false, audioProgress: 0, audioCurrentFmt: '00:00' })
        })
        ctx.onError(() => {
          this.setData({ audioPlaying: false, audioLoading: false })
          wx.showToast({ title: '语音加载失败', icon: 'none' })
        })
        self._audioCtx = ctx
      }

      if (this.data.audioPlaying) {
        self._audioCtx.pause()
        this.setData({ audioPlaying: false })
      } else {
        this.setData({ audioLoading: true })
        self._audioCtx.play()
        this.setData({ audioPlaying: true })
      }
    },

    onAudioSeek(e: WechatMiniprogram.SliderChange) {
      const self = this as any
      if (!self._audioCtx) return
      const t = (e.detail.value / 100) * (this.data.audioDuration || 0)
      self._audioCtx.seek(t)
      this.setData({ audioCurrentFmt: fmtTime(t) })
    },

    audioStep(e: WechatMiniprogram.TouchEvent) {
      const self = this as any
      if (!self._audioCtx) return
      const sec = e.currentTarget.dataset.sec as number
      const t = Math.max(0, Math.min((self._audioCtx.currentTime || 0) + sec, self._audioCtx.duration || 0))
      self._audioCtx.seek(t)
    },

    // ── 视频 ──────────────────────────────────────────
    toggleVideo() {
      if (this.data.videoExpanded) {
        this.setData({ videoExpanded: false })
        return
      }
      wx.getNetworkType({
        success: (res) => {
          if (res.networkType !== 'wifi') {
            wx.showModal({
              title: '流量提示',
              content: '当前非 Wi-Fi 环境，播放视频将消耗移动流量，是否继续？',
              success: (r) => { if (r.confirm) this.setData({ videoExpanded: true }) },
            })
          } else {
            this.setData({ videoExpanded: true })
          }
        },
        fail: () => this.setData({ videoExpanded: true }),
      })
    },

    onVideoError() {
      wx.showToast({ title: '视频加载失败，请检查网络', icon: 'none', duration: 2000 })
    },

    // ── 分享 ──────────────────────────────────────────
    onShareAppMessage() {
      const e = this.data.exhibit
      return {
        title: e ? `${e.name}——北部湾海洋生态守护站` : '北部湾海洋生态守护站讲解',
        imageUrl: e?.image || '',
        path: e ? `/pages/exhibit/exhibit?id=${e.id}` : '/pages/index/index',
      }
    },

    onShareTimeline() {
      const e = this.data.exhibit
      return {
        title: e ? `${e.name}——北部湾海洋生态守护站` : '北部湾海洋生态守护站讲解',
        imageUrl: e?.image || '',
        query: e ? `id=${e.id}` : '',
      }
    },
  },
})
