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
    onLoad(query: Record<string, string>) {
      const id = (query.id || '').trim()
      const exhibit = getExhibitById(id)
      if (!exhibit) {
        this.setData({ notFound: true })
        return
      }
      this.setData({ exhibit })
    },

    // 展开/收起语音区块
    toggleAudio() {
      this.setData({ audioExpanded: !this.data.audioExpanded })
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
