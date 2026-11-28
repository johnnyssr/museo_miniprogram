// components/exhibit-card/exhibit-card.ts —— 展品列表卡片
Component({
  properties: {
    // 期望字段：{ id, name, summary?, category?, image, visited }
    exhibit: { type: Object, value: {} as Record<string, unknown> },
  },
  methods: {
    onTap() {
      this.triggerEvent('tap', { id: (this.data.exhibit as { id?: string }).id })
    },
  },
})
