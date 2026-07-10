# 展品列表页 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为博物馆讲解小程序增加「浏览全部展品」入口：首页加跳转按钮，新增展品列表页（卡片：图+名称+年代），点卡片进现有详情页。

**Architecture:** 数据服务新增 `getAllExhibits()`；首页在扫码按钮下加次要按钮跳转列表页；新增 `pages/list` 列表页渲染卡片并复用 `pages/exhibit?id=` 详情页。

**Tech Stack:** 微信小程序 TypeScript，`Component()` 构造器，`wx.navigateTo`。视觉沿用现有博物馆配色（米底 `#f5f3ee`、深棕 `#3a2f22`、点缀棕 `#8a6d3b`）。

**说明：** 无自动化测试框架，用「手动/静态验证步骤」代替。每个 task 末尾提交。

---

### Task 1: 数据服务新增 getAllExhibits

**Files:**
- Modify: `miniprogram/services/exhibit.ts`

- [ ] **Step 1: 在文件末尾（`getExhibitById` 之后）新增函数**

在 `miniprogram/services/exhibit.ts` 末尾、`getExhibitById` 函数**之后**追加：

```ts

/** 返回全部展品（用于列表页浏览） */
export function getAllExhibits(): Exhibit[] {
  return EXHIBITS
}
```

不要改动现有的 `EXHIBITS` 数组、`getExhibitById` 或媒体常量。

- [ ] **Step 2: 静态验证**

确认：`getAllExhibits` 已 `export`；返回类型为 `Exhibit[]`；引用的 `EXHIBITS` 是同文件内已定义的常量；`Exhibit` 类型已在文件顶部 import。

- [ ] **Step 3: Commit**

```bash
git add miniprogram/services/exhibit.ts
git commit -m "feat: add getAllExhibits to exhibit service"
```

---

### Task 2: 首页新增「浏览全部展品」按钮

**Files:**
- Modify: `miniprogram/pages/index/index.ts`
- Modify: `miniprogram/pages/index/index.wxml`
- Modify: `miniprogram/pages/index/index.wxss`

- [ ] **Step 1: 在 index.ts 的 methods 里新增跳转方法**

`miniprogram/pages/index/index.ts` 当前内容为：

```ts
// index.ts —— 博物馆讲解首页
import { getExhibitById } from '../../services/exhibit'

Component({
  methods: {
    // 点击「扫一扫」
    onScan() {
      wx.scanCode({
        success: (res) => {
          const id = (res.result || '').trim()
          const exhibit = getExhibitById(id)
          if (!exhibit) {
            wx.showToast({ title: '未找到该展品', icon: 'none' })
            return
          }
          wx.navigateTo({ url: `/pages/exhibit/exhibit?id=${id}` })
        },
        fail: () => {
          // 用户主动取消扫码，静默处理
        },
      })
    },
  },
})
```

在 `onScan` 方法**之后**（同一 `methods` 对象内）新增一个方法。整体替换 `methods` 块为：

```ts
  methods: {
    // 点击「扫一扫」
    onScan() {
      wx.scanCode({
        success: (res) => {
          const id = (res.result || '').trim()
          const exhibit = getExhibitById(id)
          if (!exhibit) {
            wx.showToast({ title: '未找到该展品', icon: 'none' })
            return
          }
          wx.navigateTo({ url: `/pages/exhibit/exhibit?id=${id}` })
        },
        fail: () => {
          // 用户主动取消扫码，静默处理
        },
      })
    },

    // 点击「浏览全部展品」
    onBrowseAll() {
      wx.navigateTo({ url: '/pages/list/list' })
    },
  },
```

- [ ] **Step 2: 在 index.wxml 的扫码按钮下方加次要按钮**

`miniprogram/pages/index/index.wxml` 当前的 `.hint` 一行下方（`</view>` 容器闭合之前）插入按钮。整体替换为：

```html
<!--index.wxml-->
<view class="container">
  <view class="hero">
    <view class="title">博物馆讲解</view>
    <view class="subtitle">扫描展品二维码，聆听它的故事</view>
  </view>
  <button class="scan-btn" bindtap="onScan">扫一扫</button>
  <view class="browse-link" bindtap="onBrowseAll">浏览全部展品</view>
  <view class="hint">在开发者工具中点击后可手动输入展品编号（如 exhibit-001）</view>
</view>
```

- [ ] **Step 3: 在 index.wxss 末尾加次要按钮样式**

在 `miniprogram/pages/index/index.wxss` 末尾追加（不改动已有样式）：

```css
.browse-link {
  margin-top: 32rpx;
  font-size: 28rpx;
  color: #8a6d3b;
  padding: 12rpx 24rpx;
  border: 1rpx solid #d8c9ad;
  border-radius: 40rpx;
}
```

> 设计意图：「浏览全部展品」是次要操作，用描边文字按钮（而非实心大按钮），弱于主操作「扫一扫」，视觉主次分明。

- [ ] **Step 4: 静态验证**

确认：`onBrowseAll` 在 ts methods 中定义，wxml `bindtap="onBrowseAll"` 名称一致；`onScan` 逻辑未被破坏；跳转 url `/pages/list/list` 将在 Task 3 注册。

- [ ] **Step 5: Commit**

```bash
git add miniprogram/pages/index/
git commit -m "feat: add browse-all-exhibits button to index page"
```

---

### Task 3: 新增展品列表页

**Files:**
- Create: `miniprogram/pages/list/list.ts`
- Create: `miniprogram/pages/list/list.wxml`
- Create: `miniprogram/pages/list/list.wxss`
- Create: `miniprogram/pages/list/list.json`
- Modify: `miniprogram/app.json`

- [ ] **Step 1: 注册页面路径 app.json**

`miniprogram/app.json` 的 `pages` 数组中，在 `"pages/exhibit/exhibit"` 之后新增 `"pages/list/list"`。整体替换为：

```json
{
  "pages": [
    "pages/index/index",
    "pages/exhibit/exhibit",
    "pages/list/list",
    "pages/logs/logs"
  ],
  "window": {
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "博物馆讲解",
    "navigationBarBackgroundColor": "#ffffff"
  },
  "style": "v2",
  "componentFramework": "glass-easel",
  "lazyCodeLoading": "requiredComponents"
}
```

- [ ] **Step 2: 创建 list.json**

写入 `miniprogram/pages/list/list.json`：

```json
{
  "usingComponents": {},
  "navigationBarTitleText": "全部展品"
}
```

- [ ] **Step 3: 创建 list.ts**

写入 `miniprogram/pages/list/list.ts`：

```ts
// list.ts —— 展品列表页
import { getAllExhibits } from '../../services/exhibit'
import { Exhibit } from '../../models/exhibit'

Component({
  data: {
    list: [] as Exhibit[],
  },
  methods: {
    onLoad() {
      this.setData({ list: getAllExhibits() })
    },

    // 点击卡片进入详情
    onTapExhibit(e: WechatMiniprogram.TouchEvent) {
      const id = e.currentTarget.dataset.id as string
      wx.navigateTo({ url: `/pages/exhibit/exhibit?id=${id}` })
    },
  },
})
```

- [ ] **Step 4: 创建 list.wxml**

写入 `miniprogram/pages/list/list.wxml`：

```html
<!--list.wxml-->
<scroll-view scroll-y class="page">
  <view class="page-title">全部展品</view>

  <view wx:if="{{list.length === 0}}" class="empty">
    <text>暂无展品</text>
  </view>

  <view
    wx:for="{{list}}"
    wx:key="id"
    class="card"
    data-id="{{item.id}}"
    bindtap="onTapExhibit"
  >
    <image class="thumb" src="{{item.image}}" mode="aspectFill" />
    <view class="card-body">
      <text class="card-name">{{item.name}}</text>
      <text wx:if="{{item.dynasty}}" class="card-dynasty">{{item.dynasty}}</text>
    </view>
    <view class="card-arrow">›</view>
  </view>
</scroll-view>
```

- [ ] **Step 5: 创建 list.wxss**

写入 `miniprogram/pages/list/list.wxss`：

```css
/**list.wxss**/
.page {
  height: 100vh;
  background: #f5f3ee;
  box-sizing: border-box;
}
.page-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #3a2f22;
  padding: 40rpx 30rpx 20rpx;
}
.empty {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
  color: #8a7d6a;
  font-size: 30rpx;
}
.card {
  display: flex;
  align-items: center;
  margin: 20rpx 30rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 6rpx 24rpx rgba(58, 47, 34, 0.06);
}
.thumb {
  width: 140rpx;
  height: 140rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
  background: #eee7d9;
}
.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: 24rpx;
}
.card-name {
  font-size: 34rpx;
  font-weight: bold;
  color: #3a2f22;
}
.card-dynasty {
  margin-top: 10rpx;
  font-size: 26rpx;
  color: #8a6d3b;
}
.card-arrow {
  font-size: 44rpx;
  color: #c9bda6;
  padding-left: 12rpx;
}
```

> 设计意图：白卡片 + 柔和阴影 + 圆角缩略图，卡片间留白；名称主、年代次、右侧箭头暗示可点击。整体安静雅致，贴合文物调性。

- [ ] **Step 6: 静态验证**

确认：
- import 路径 `../../services/exhibit`（`getAllExhibits`，Task 1 已加）与 `../../models/exhibit`（`Exhibit`）正确。
- wxml `bindtap="onTapExhibit"`、`wx:for`/`wx:key="id"`、`data-id="{{item.id}}"` 与 ts 中 `onTapExhibit` 读取 `e.currentTarget.dataset.id` 一致。
- `onLoad` 在 methods 内（`Component()` 页面写法正确）。
- app.json 合法 JSON、pages 4 项顺序正确；list.json 合法 JSON。
- 跳转 url `/pages/exhibit/exhibit?id=${id}` 与现有详情页一致。

- [ ] **Step 7: 手动验证完整流程**

开发者工具编译后：
1. 首页显示「扫一扫」+「浏览全部展品」，主次分明。
2. 点「浏览全部展品」→ 列表页显示 3 张卡片（图+名称+年代）。
3. 点任一卡片 → 进入对应详情页，图文/语音/视频正常。
4. 详情页返回→列表页；列表页返回→首页。

- [ ] **Step 8: Commit**

```bash
git add miniprogram/pages/list/ miniprogram/app.json
git commit -m "feat: add exhibit list page"
```

---

## Self-Review

**Spec coverage：**
- 首页保留扫码为主 + 新增「浏览全部展品」按钮 → Task 2 ✅
- 独立列表页 `pages/list` → Task 3 ✅
- 卡片：图+名称+年代，点击进详情 → Task 3 wxml/wxss/ts ✅
- 复用详情页 `?id=`，不改详情页 → Task 3（navigateTo 到现有路由，未改 exhibit 页）✅
- 数据服务 `getAllExhibits` → Task 1 ✅
- 空状态「暂无展品」兜底 → Task 3 wxml `wx:if list.length===0` ✅
- 注册页面 → Task 3 app.json ✅
- 视觉沿用博物馆配色、安静雅致 → Task 2/3 样式 ✅
- 手动验证 → Task 3 Step 7 ✅

**Placeholder scan：** 无 TBD/TODO；每个改代码步骤均给完整代码。

**Type consistency：** `getAllExhibits(): Exhibit[]`（Task 1 定义，Task 3 使用一致）；`Exhibit` 字段 id/name/dynasty/image 在 Task 3 wxml/ts 引用；`onBrowseAll`（Task 2 ts/wxml 一致）；`onTapExhibit` + `data-id`/`dataset.id`（Task 3 一致）；路由 `/pages/list/list`（Task 2 跳转、Task 3 注册一致）、`/pages/exhibit/exhibit?id=`（与现有详情页一致）。
