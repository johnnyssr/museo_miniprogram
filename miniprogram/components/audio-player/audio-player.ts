const contexts = new WeakMap<object, WechatMiniprogram.InnerAudioContext>()

function fmtTime(seconds: number): string {
  return [Math.floor(seconds / 60), Math.floor(seconds % 60)]
    .map(value => String(value).padStart(2, '0')).join(':')
}

Component({
  properties: {
    src: { type: String, value: '' },
  },
  data: {
    expanded: false,
    playing: false,
    loading: false,
    duration: 0,
    progress: 0,
    durationFmt: '00:00',
    currentFmt: '00:00',
  },
  lifetimes: {
    detached() {
      this.releaseAudio()
    },
  },
  pageLifetimes: {
    hide() {
      this.pause()
    },
  },
  methods: {
    toggle() {
      this.setData({ expanded: !this.data.expanded })
    },

    releaseAudio() {
      const ctx = contexts.get(this)
      contexts.delete(this)
      ctx?.destroy()
    },

    ensureAudio() {
      const existing = contexts.get(this)
      if (existing) return existing
      const ctx = wx.createInnerAudioContext()
      contexts.set(this, ctx)
      ctx.onPlay(() => {
        if (contexts.get(this) !== ctx) return
        if (!this.data.playing && !this.data.loading) {
          ctx.pause()
          return
        }
        this.setData({ playing: true, loading: false })
      })
      ctx.onPause(() => {
        if (contexts.get(this) === ctx && !this.data.loading) this.setData({ playing: false })
      })
      ctx.onCanplay(() => this.syncTime(ctx))
      ctx.onTimeUpdate(() => this.syncTime(ctx))
      ctx.onEnded(() => {
        if (contexts.get(this) === ctx) {
          this.setData({ playing: false, loading: false, progress: 0, currentFmt: '00:00' })
        }
      })
      ctx.onError(() => {
        if (contexts.get(this) !== ctx) return
        this.releaseAudio()
        this.setData({ playing: false, loading: false, duration: 0, progress: 0, currentFmt: '00:00' })
        wx.showToast({ title: '语音加载失败，点按重试', icon: 'none' })
      })
      ctx.src = this.data.src
      return ctx
    },

    syncTime(ctx: WechatMiniprogram.InnerAudioContext) {
      if (contexts.get(this) !== ctx) return
      const duration = Number.isFinite(ctx.duration) && ctx.duration > 0 ? ctx.duration : this.data.duration
      const time = ctx.currentTime || 0
      this.setData({
        duration,
        durationFmt: fmtTime(duration),
        currentFmt: fmtTime(time),
        progress: duration ? Math.round(time / duration * 100) : 0,
      })
    },

    pause() {
      if (!this.data.playing && !this.data.loading) return
      this.setData({ playing: false, loading: false })
      contexts.get(this)?.pause()
    },

    togglePlay() {
      if (this.data.playing || this.data.loading) {
        this.pause()
        return
      }
      this.triggerEvent('playrequest')
      const ctx = this.ensureAudio()
      this.setData({ loading: true })
      ctx.play()
    },

    seek(time: number) {
      const ctx = contexts.get(this)
      const duration = this.data.duration
      if (!ctx || !duration) return
      const target = Math.max(0, Math.min(time, duration))
      ctx.seek(target)
      this.setData({ currentFmt: fmtTime(target), progress: Math.round(target / duration * 100) })
    },

    onSeek(e: WechatMiniprogram.SliderChange) {
      this.seek(e.detail.value / 100 * this.data.duration)
    },

    step(e: WechatMiniprogram.TouchEvent) {
      const ctx = contexts.get(this)
      if (ctx) this.seek(ctx.currentTime + Number(e.currentTarget.dataset.sec))
    },
  },
})
