# 博物馆讲解小程序 Demo 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个微信小程序 demo：扫描展品二维码后进入详情页，查看展品的文字、语音、视频介绍。

**Architecture:** 首页放「扫一扫」按钮调用 `wx.scanCode` 取得展品 id，跳转详情页；详情页图文为主，语音/视频作为可展开区块；所有数据来自本地 mock 的数据服务层。

**Tech Stack:** 微信小程序（TypeScript + glass-easel/Skyline，页面用 `Component()` 构造器），`wx.scanCode`、`InnerAudioContext`、`<video>` 组件。

**说明：** 小程序无自动化测试框架，本计划用「手动验证步骤」代替 TDD 的自动化测试。每个 task 末尾提交一次。所有网络媒体在开发者工具需勾选「详情 → 本地设置 → 不校验合法域名」。

---

### Task 1: 数据模型与数据服务

**Files:**
- Create: `miniprogram/models/exhibit.ts`
- Create: `miniprogram/services/exhibit.ts`

- [ ] **Step 1: 创建 `Exhibit` 类型定义**

写入 `miniprogram/models/exhibit.ts`：

```ts
export interface Exhibit {
  id: string          // 展品唯一标识，二维码里编码的就是它
  name: string        // 展品名称
  dynasty?: string    // 年代（如「唐代」），可选
  image: string       // 展品图片 URL
  text: string        // 文字介绍
  audioUrl: string    // 语音介绍 URL
  videoUrl: string    // 视频介绍 URL
}
```

- [ ] **Step 2: 创建 mock 数据与查询函数**

写入 `miniprogram/services/exhibit.ts`：

```ts
import { Exhibit } from '../models/exhibit'

const EXHIBITS: Exhibit[] = [
  {
    id: 'exhibit-001',
    name: '青铜面具',
    dynasty: '商代',
    image: 'https://placehold.co/600x400?text=Bronze+Mask',
    text: '这件青铜面具铸造于商代晚期，采用范铸法制成，双目突出，造型威严，是祭祀礼器的代表，反映了当时高超的青铜冶铸工艺。',
    audioUrl: 'https://mp-cff48fa7-fc9f-45c3-b3fc-687e29e2cc0a.cdn.bspapp.com/simple/audio-sample.mp3',
    videoUrl: 'https://wxsnsdy.tc.qq.com/105/20210/snsdyvideodownload?filekey=30280201010421301f0201690402534804102ca905ce620b1241b726bc41dcff44e00204012882540400&bizid=1023&hy=SH&fileparam=302c020101042530230204136ffd93020457e3c4ff02024ef202031e8d7f02030f42400204045a320a0201000400',
  },
  {
    id: 'exhibit-002',
    name: '山水立轴',
    dynasty: '宋代',
    image: 'https://placehold.co/600x400?text=Landscape+Scroll',
    text: '这幅山水立轴以水墨勾勒层峦叠嶂，笔法细腻，意境深远，是宋代文人画的典型风格，体现了「可行、可望、可游、可居」的审美理想。',
    audioUrl: 'https://mp-cff48fa7-fc9f-45c3-b3fc-687e29e2cc0a.cdn.bspapp.com/simple/audio-sample.mp3',
    videoUrl: 'https://wxsnsdy.video.tc.qq.com/1007/20302/snsdyvideodownload?filekey=30280201010421301f0201690402534804102bcc9296acc8e7885f141507881137e00204012882540400&bizid=1023&hy=SH&fileparam=302c020101042530230204136ffd93020457e3c4ff02024ef202031e8d7f02030f42400204045a320a0201000400',
  },
  {
    id: 'exhibit-003',
    name: '青花瓷瓶',
    dynasty: '明代',
    image: 'https://placehold.co/600x400?text=Blue+White+Vase',
    text: '这件青花瓷瓶烧制于明代永乐年间，胎质细腻，青花发色浓艳，纹饰繁密流畅，是景德镇官窑的精品，展现了明代制瓷业的巅峰水平。',
    audioUrl: 'https://mp-cff48fa7-fc9f-45c3-b3fc-687e29e2cc0a.cdn.bspapp.com/simple/audio-sample.mp3',
    videoUrl: 'https://wxsnsdy.tc.qq.com/105/20210/snsdyvideodownload?filekey=30280201010421301f0201690402534804102ca905ce620b1241b726bc41dcff44e00204012882540400&bizid=1023&hy=SH&fileparam=302c020101042530230204136ffd93020457e3c4ff02024ef202031e8d7f02030f42400204045a320a0201000400',
  },
]

/** 按 id 查询展品，找不到返回 undefined */
export function getExhibitById(id: string): Exhibit | undefined {
  return EXHIBITS.find(e => e.id === id)
}
```

> 注：`audioUrl` 使用公开示例 mp3；若该地址失效，任务执行时可替换为任一可访问的 mp3 直链。视频用微信社区常用示例直链。手动验证时以「能加载播放」为准，具体片段内容不限。

- [ ] **Step 3: 手动验证服务逻辑（临时打印）**

在 `miniprogram/app.ts` 的 `onLaunch` 里临时加：

```ts
import { getExhibitById } from './services/exhibit'
console.log('found:', getExhibitById('exhibit-001')?.name)   // 期望：青铜面具
console.log('missing:', getExhibitById('nope'))              // 期望：undefined
```

编译后看 Console 输出符合期望，然后**删除这两行临时打印和 import**。

- [ ] **Step 4: Commit**

```bash
git add miniprogram/models/exhibit.ts miniprogram/services/exhibit.ts
git commit -m "feat: add exhibit model and local mock data service"
```

---

### Task 2: 改造首页为扫码入口

**Files:**
- Modify: `miniprogram/pages/index/index.ts`（整体替换）
- Modify: `miniprogram/pages/index/index.wxml`（整体替换）
- Modify: `miniprogram/pages/index/index.wxss`（整体替换）
- Modify: `miniprogram/app.json`（改导航栏标题）

- [ ] **Step 1: 替换首页逻辑 `index.ts`**

整体替换 `miniprogram/pages/index/index.ts` 内容：

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

- [ ] **Step 2: 替换首页结构 `index.wxml`**

整体替换 `miniprogram/pages/index/index.wxml`：

```html
<!--index.wxml-->
<view class="container">
  <view class="hero">
    <view class="title">博物馆讲解</view>
    <view class="subtitle">扫描展品二维码，聆听它的故事</view>
  </view>
  <button class="scan-btn" bindtap="onScan">扫一扫</button>
  <view class="hint">在开发者工具中点击后可手动输入展品编号（如 exhibit-001）</view>
</view>
```

- [ ] **Step 3: 替换首页样式 `index.wxss`**

整体替换 `miniprogram/pages/index/index.wxss`：

```css
/**index.wxss**/
page {
  height: 100vh;
  background: #f5f3ee;
}
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}
.hero {
  text-align: center;
  margin-bottom: 120rpx;
}
.title {
  font-size: 52rpx;
  font-weight: bold;
  color: #3a2f22;
}
.subtitle {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: #8a7d6a;
}
.scan-btn {
  width: 60%;
  background: #8a6d3b;
  color: #fff;
  border-radius: 48rpx;
  font-size: 32rpx;
}
.hint {
  margin-top: 40rpx;
  font-size: 24rpx;
  color: #b0a692;
  padding: 0 60rpx;
  text-align: center;
}
```

- [ ] **Step 4: 修改导航栏标题 `app.json`**

把 `miniprogram/app.json` 中 `window.navigationBarTitleText` 由 `"Weixin"` 改为 `"博物馆讲解"`。

- [ ] **Step 5: 手动验证首页**

开发者工具编译后：首页显示「博物馆讲解」标题和「扫一扫」按钮，无编译报错。点击「扫一扫」弹出模拟输入框（此时输入不做验证，下一 task 建详情页后再验证跳转）。

- [ ] **Step 6: Commit**

```bash
git add miniprogram/pages/index/ miniprogram/app.json
git commit -m "feat: turn index page into museum scan entry"
```

---

### Task 3: 新建展品详情页

**Files:**
- Create: `miniprogram/pages/exhibit/exhibit.ts`
- Create: `miniprogram/pages/exhibit/exhibit.wxml`
- Create: `miniprogram/pages/exhibit/exhibit.wxss`
- Create: `miniprogram/pages/exhibit/exhibit.json`
- Modify: `miniprogram/app.json`（注册页面路径）

- [ ] **Step 1: 注册详情页路径 `app.json`**

在 `miniprogram/app.json` 的 `pages` 数组中新增 `"pages/exhibit/exhibit"`，例如：

```json
{
  "pages": [
    "pages/index/index",
    "pages/exhibit/exhibit",
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

- [ ] **Step 2: 创建详情页配置 `exhibit.json`**

写入 `miniprogram/pages/exhibit/exhibit.json`：

```json
{
  "usingComponents": {},
  "navigationBarTitleText": "展品详情"
}
```

- [ ] **Step 3: 创建详情页逻辑 `exhibit.ts`**

写入 `miniprogram/pages/exhibit/exhibit.ts`：

```ts
// exhibit.ts —— 展品详情页
import { getExhibitById } from '../../services/exhibit'
import { Exhibit } from '../../models/exhibit'

let audioCtx: WechatMiniprogram.InnerAudioContext | null = null

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
      // 页面销毁时释放音频
      if (audioCtx) {
        audioCtx.destroy()
        audioCtx = null
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

      if (!audioCtx) {
        audioCtx = wx.createInnerAudioContext()
        audioCtx.src = exhibit.audioUrl
        audioCtx.onEnded(() => this.setData({ audioPlaying: false }))
        audioCtx.onError(() => {
          this.setData({ audioPlaying: false })
          wx.showToast({ title: '语音加载失败', icon: 'none' })
        })
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
```

- [ ] **Step 4: 创建详情页结构 `exhibit.wxml`**

写入 `miniprogram/pages/exhibit/exhibit.wxml`：

```html
<!--exhibit.wxml-->
<view wx:if="{{notFound}}" class="empty">
  <text>未找到该展品</text>
</view>

<scroll-view wx:elif="{{exhibit}}" scroll-y class="page">
  <image class="cover" src="{{exhibit.image}}" mode="aspectFill" />
  <view class="header">
    <text class="name">{{exhibit.name}}</text>
    <text wx:if="{{exhibit.dynasty}}" class="dynasty">{{exhibit.dynasty}}</text>
  </view>

  <view class="section">
    <view class="section-title">文字介绍</view>
    <text class="text">{{exhibit.text}}</text>
  </view>

  <!-- 语音介绍：可展开 -->
  <view class="block">
    <view class="block-head" bindtap="toggleAudio">
      <text>语音介绍</text>
      <text class="arrow">{{audioExpanded ? '收起' : '展开'}}</text>
    </view>
    <view wx:if="{{audioExpanded}}" class="block-body">
      <button class="play-btn" bindtap="toggleAudioPlay">
        {{audioPlaying ? '暂停' : '播放'}}
      </button>
    </view>
  </view>

  <!-- 视频介绍：可展开，展开才渲染 video -->
  <view class="block">
    <view class="block-head" bindtap="toggleVideo">
      <text>视频介绍</text>
      <text class="arrow">{{videoExpanded ? '收起' : '展开'}}</text>
    </view>
    <view wx:if="{{videoExpanded}}" class="block-body">
      <video
        class="video"
        src="{{exhibit.videoUrl}}"
        binderror="onVideoError"
      />
    </view>
  </view>
</scroll-view>
```

- [ ] **Step 5: 创建详情页样式 `exhibit.wxss`**

写入 `miniprogram/pages/exhibit/exhibit.wxss`：

```css
/**exhibit.wxss**/
.page {
  height: 100vh;
  background: #f5f3ee;
}
.empty {
  display: flex;
  height: 100vh;
  align-items: center;
  justify-content: center;
  color: #8a7d6a;
  font-size: 30rpx;
}
.cover {
  width: 100%;
  height: 420rpx;
}
.header {
  padding: 30rpx;
  background: #fff;
}
.name {
  font-size: 40rpx;
  font-weight: bold;
  color: #3a2f22;
}
.dynasty {
  margin-left: 16rpx;
  font-size: 26rpx;
  color: #8a6d3b;
}
.section {
  margin: 20rpx;
  padding: 30rpx;
  background: #fff;
  border-radius: 16rpx;
}
.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #3a2f22;
  margin-bottom: 16rpx;
}
.text {
  font-size: 28rpx;
  line-height: 1.7;
  color: #5a5145;
}
.block {
  margin: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}
.block-head {
  display: flex;
  justify-content: space-between;
  padding: 30rpx;
  font-size: 30rpx;
  font-weight: bold;
  color: #3a2f22;
}
.arrow {
  font-size: 26rpx;
  color: #8a6d3b;
  font-weight: normal;
}
.block-body {
  padding: 0 30rpx 30rpx;
}
.play-btn {
  background: #8a6d3b;
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
}
.video {
  width: 100%;
}
```

- [ ] **Step 6: 手动验证详情页完整流程**

开发者工具编译后：
1. 首页点「扫一扫」→ 模拟输入框输入 `exhibit-001` → 跳转详情页，显示青铜面具图文。
2. 点「语音介绍」展开 → 点「播放」音频播放、按钮变「暂停」（需勾选「不校验合法域名」）。
3. 点「视频介绍」展开 → video 组件加载并可播放。
4. 返回首页再输入 `bad-id` → toast「未找到该展品」，不跳转。
5. 在播放音频状态下返回首页 → 音频停止（detached 释放）。

- [ ] **Step 7: Commit**

```bash
git add miniprogram/pages/exhibit/ miniprogram/app.json
git commit -m "feat: add exhibit detail page with text/audio/video"
```

---

## Self-Review

**Spec coverage：**
- 本地 mock 数据 → Task 1 ✅
- 扫一扫按钮 `wx.scanCode` → Task 2 ✅
- 图文为主、语音/视频可展开区块 → Task 3（`audioExpanded`/`videoExpanded`，video 展开才渲染）✅
- 公开示例媒体 URL → Task 1 数据 ✅
- 错误处理（扫码取消静默、id 找不到 toast/空状态、媒体 error toast）→ Task 2 fail 回调 + Task 3 `notFound`/`onVideoError`/audio `onError` ✅
- 音频离开页面释放 → Task 3 `detached` 中 `audioCtx.destroy()` ✅
- 手动验证测试策略 → 各 task 的手动验证步骤 ✅

**Placeholder scan：** 无 TBD/TODO；每个改代码的步骤都给了完整代码。媒体 URL 处标注了「失效则替换」的处理方式，属可执行说明而非占位。

**Type consistency：** `Exhibit` 字段（id/name/dynasty/image/text/audioUrl/videoUrl）在 Task 1 定义，Task 3 的 wxml/ts 引用一致；`getExhibitById` 命名在 Task 1/2/3 一致；data 字段 `audioExpanded`/`videoExpanded`/`audioPlaying`/`notFound`/`exhibit` 在 ts 与 wxml 中一致。
