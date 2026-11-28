// components/section-block/section-block.ts —— 通用可折叠区块（受控）
// 父组件通过 expanded 控制展开态，并监听 toggle 事件自行决定是否展开
// （如视频需先做非 Wi-Fi 流量确认），从而统一标题栏样式与交互。
Component({
  options: { multipleSlots: true },
  properties: {
    title: { type: String, value: '' },
    expanded: { type: Boolean, value: false },
    hint: { type: String, value: '' }, // 收起态右上角提示文案，默认「展开」
  },
  methods: {
    onToggle() {
      this.triggerEvent('toggle', { expanded: !this.data.expanded })
    },
  },
})
