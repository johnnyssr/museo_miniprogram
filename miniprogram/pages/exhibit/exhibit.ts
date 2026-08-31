// exhibit.ts —— 展品详情页
import { getExhibitById } from '../../services/exhibit'
import { Exhibit } from '../../models/exhibit'

Component({
  data: {
    exhibit: null as Exhibit | null,
    notFound: false,
    audioExpanded: false,
    videoExpanded: false,
    audioPlaying: false,
  },
  lifetimes: {
    detached() {
      // 页面销毁时释放音频（每个页面实例独立持有 _audioCtx）
      const self = this as any
      if (self._audioCtx) {
        self._audioCtx.destroy()
        self._audioCtx = null
      }
    },
  },
  methods: {
    async onLoad(query: Record<string, string>) {
      // 入口兼容两种来源：
      //  - 列表跳转 / 普通扫码：参数在 query.id
      //  - 小程序码（wxacode）扫码：参数在 query.scene（值即 exhibitId，可能被 URL 编码）
      const id = (query.id || decodeURIComponent(query.scene || '') || '').trim()
      wx.showLoading({ title: '加载中' })
      try {
        const exhibit = await getExhibitById(id)
        if (!exhibit) {
          this.setData({ notFound: true })
          return
        }
        this.setData({ exhibit })
      } catch (e) {
        wx.showToast({ title: '加载失败，请重试', icon: 'none' })
      } finally {
        wx.hideLoading()
      }
    },

    // 展开/收起语音区块
    toggleAudio() {
      this.setData({ audioExpanded: !this.data.audioExpanded })
    },

    // 点击封面图全屏预览（支持缩放、左右切换）
    onPreviewImage(e: WechatMiniprogram.TouchEvent) {
      const current = e.currentTarget.dataset.src as string
      const urls = this.data.exhibit?.images || []
      if (urls.length) wx.previewImage({ current, urls })
    },

    // 播放/暂停语音
    toggleAudioPlay() {
      const exhibit = this.data.exhibit
      if (!exhibit) return

      const self = this as any
      let audioCtx: WechatMiniprogram.InnerAudioContext | null = self._audioCtx
      if (!audioCtx) {
        audioCtx = wx.createInnerAudioContext()
        audioCtx.src = exhibit.audioUrl
        audioCtx.onEnded(() => this.setData({ audioPlaying: false }))
        audioCtx.onError(() => {
          this.setData({ audioPlaying: false })
          wx.showToast({ title: '语音加载失败', icon: 'none' })
        })
        self._audioCtx = audioCtx
      }

      if (this.data.audioPlaying) {
        audioCtx.pause()
        this.setData({ audioPlaying: false })
      } else {
        audioCtx.play()
        this.setData({ audioPlaying: true })
      }
    },

    // 展开/收起视频区块
    toggleVideo() {
      this.setData({ videoExpanded: !this.data.videoExpanded })
    },

    // 视频加载失败
    onVideoError() {
      wx.showToast({ title: '视频加载失败', icon: 'none' })
    },
  },
})
