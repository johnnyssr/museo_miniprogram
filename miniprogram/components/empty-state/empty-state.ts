// components/empty-state/empty-state.ts —— 统一空状态
Component({
  properties: {
    icon: { type: String, value: '🐚' },
    text: { type: String, value: '暂无内容' },
    ctaText: { type: String, value: '' },
  },
  methods: {
    onCta() {
      this.triggerEvent('cta')
    },
  },
})
