# 展品列表页设计文档

日期：2026-07-10
状态：已确认

## 目标

在博物馆讲解小程序中，为不想扫码的用户提供一个「浏览全部展品」的入口：首页仍以「扫一扫」为主，下方增加一个跳转按钮，进入独立的展品列表页；列表以卡片形式展示所有展品（图 + 名称 + 年代），点击任意卡片进入现有详情页。

## 范围与约定

- 首页 `pages/index` 保留「扫一扫」为主操作，新增一个次要按钮「浏览全部展品」。
- 新增独立列表页 `pages/list`。
- 复用现有详情页 `pages/exhibit`（`?id=xxx`），不改动详情页。
- 数据仍来自本地 `services/exhibit.ts`。
- 视觉沿用现有博物馆配色（米底 `#f5f3ee`、深棕 `#3a2f22`、点缀棕 `#8a6d3b`），列表走安静雅致的风格：克制留白、柔和阴影、统一缩略图比例、名称/年代主次分明。

## 架构与文件

- **首页 `pages/index/*`（改）** —— 在「扫一扫」按钮下方加一个次要样式按钮「浏览全部展品」，`bindtap` 调 `wx.navigateTo` 到 `/pages/list/list`。
- **列表页 `pages/list/*`（新增）** —— `onLoad` 调 `getAllExhibits()` 拿全部展品，渲染卡片列表；点击卡片 `wx.navigateTo` 到 `/pages/exhibit/exhibit?id=xxx`。
- **数据服务 `services/exhibit.ts`（改）** —— 新增 `getAllExhibits(): Exhibit[]`，返回全部展品。列表页只通过该函数取数据，不直接访问 `EXHIBITS`。
- **`app.json`（改）** —— 注册 `pages/list/list`。

## 数据流

```
首页点「浏览全部展品」→ navigateTo /pages/list/list
  → 列表页 onLoad 调 getAllExhibits() → setData(list) → 渲染卡片
  → 点卡片 → navigateTo /pages/exhibit/exhibit?id=xxx → 详情页（与扫码进入一致）
```

## 卡片视觉设计

- 每行一张卡片，横向布局：左侧缩略图（固定宽高、`aspectFill`、圆角），右侧文字区。
- 文字区：名称（较大、深棕、加粗）在上，年代（较小、点缀棕）在下。
- 卡片：白底、圆角、柔和阴影，卡片之间留白。
- 页面：米色背景，顶部可留一个简单标题区（如「全部展品」）。

## 错误处理

- 数据来自本地，不会请求失败。
- `getAllExhibits()` 返回空数组时，列表页显示「暂无展品」空状态（demo 中不会触发，作兜底）。

## 测试策略（手动验证）

1. 首页显示「扫一扫」+「浏览全部展品」两个按钮，样式主次分明。
2. 点「浏览全部展品」→ 进入列表页，显示 3 张卡片（图 + 名称 + 年代）。
3. 点任意一张卡片 → 进入对应详情页，图文/语音/视频正常。
4. 详情页返回 → 回到列表页；列表页返回 → 回到首页。

## 文件清单

- `miniprogram/services/exhibit.ts`（改：新增 `getAllExhibits`）
- `miniprogram/pages/index/index.ts` / `.wxml` / `.wxss`（改：加按钮）
- `miniprogram/pages/list/list.ts` / `.wxml` / `.wxss` / `.json`（新增）
- `miniprogram/app.json`（改：注册页面）
