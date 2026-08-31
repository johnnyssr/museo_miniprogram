# 展品管理后台重设计 + 全端海洋青蓝配色统一 · 设计文档

- 日期：2026-08-30
- 状态：待用户确认
- 范围：`admin/`（Vue 3 + Element Plus 网页后台）重设计与批量运维功能；`miniprogram/`（访客小程序）配色统一
- 关联文档：`docs/superpowers/specs/2026-08-18-admin-web-design.md`（后台初版设计，已实现）

---

## 1. 背景与目标

现状：
- **后台**是独立的 Vue 3 + Element Plus + Vite 网页应用（`admin/`），部署在 CloudBase 静态托管。目前是扁平 3 路由（登录 / 展品列表 / 新增编辑），无导航骨架、无数据概览，按钮沿用 Element Plus 默认蓝，棕色主题以内联 hex 散落各组件，且**完全没有任何批量操作**。
- **小程序**（`miniprogram/`）是访客端讲解应用，暖棕/米色博物馆风，11 个硬编码颜色散落在 3 个页面 `.wxss` 中，核心强调色为棕色 `#8a6d3b`。

目标：
1. 把后台升级为**专业运维平台**观感：侧边栏 + 顶栏骨架、数据概览页、统一设计系统。
2. 新增**批量运维操作**：批量删除、批量导出二维码、批量导入、批量设置字段。
3. 全端配色统一为**海洋青蓝**主题（贴合"北部湾海洋生态守护站"账号定位），后台与小程序视觉协调。

非目标（YAGNI）：用户/角色管理、操作审计日志、多语言、深色模式、小程序端功能改造（仅改配色，不动交互）。

---

## 2. 设计系统：海洋青蓝配色

一套色板，两端共用（后台走 Element Plus 主题变量，小程序走集中式 WXSS 变量）。

### 2.1 色板定义（Design Tokens）

| Token | 值 | 用途 |
|---|---|---|
| `primary` | `#1f6f78` | 主色（深海青蓝）：按钮、链接、选中态、强调 |
| `primary-dark` | `#155159` | 主色按下/深色态、导航栏底色 |
| `primary-light` | `#2a8a95` | hover 态 |
| `primary-bg` | `#e6f2f2` | 主色浅底（选中行、标签底） |
| `accent` | `#e2a13b` | 暖金点缀：次要 CTA、徽标、重点数值 |
| `text-strong` | `#183b40` | 主标题（深青墨） |
| `text-body` | `#3d5257` | 正文 |
| `text-muted` | `#7a9196` | 次要/说明文字、空状态 |
| `text-hint` | `#a9bcc0` | 三级提示、箭头 |
| `bg-page` | `#f2f7f7` | 页面背景（冷调浅色） |
| `surface` | `#ffffff` | 卡片/表面 |
| `border` | `#cfe1e2` | 边框/分隔线 |
| `placeholder` | `#e0efee` | 缩略图/占位底 |
| `success` | `#3fa66a` | 成功态 |
| `warning` | `#e2a13b` | 警告态（复用 accent） |
| `danger` | `#d9534f` | 危险/删除态 |
| `shadow` | `rgba(24,59,64,0.08)` | 卡片阴影 |

### 2.2 旧棕色 → 新青蓝 映射（迁移对照表）

| 旧值（棕色系） | 新值（青蓝系） | 出现位置 |
|---|---|---|
| `#8a6d3b`（主强调） | `#1f6f78` | 后台 header、小程序按钮/链接/朝代标签/箭头 |
| `#3a2f22`（主标题） | `#183b40` | 两端标题文字 |
| `#5a5145`（正文） | `#3d5257` | 小程序详情正文 |
| `#8a7d6a`（次要文字） | `#7a9196` | 两端 muted 文字、空状态 |
| `#b0a692`（提示） | `#a9bcc0` | 小程序 hint |
| `#f5f3ee`（页面底） | `#f2f7f7` | 小程序页面背景 |
| `#d8c9ad`（边框） | `#cfe1e2` | 小程序 browse-link 边框 |
| `#c9bda6`（箭头） | `#a9bcc0` | 小程序列表箭头 |
| `#eee7d9`（占位底） | `#e0efee` | 小程序缩略图占位 |
| `rgba(58,47,34,0.06)`（阴影） | `rgba(24,59,64,0.08)` | 小程序卡片阴影 |

---

## 3. 后台重设计（`admin/`）

### 3.1 整体外壳（Layout Shell）

由现在的"无骨架"改为经典后台三段式，用 Element Plus `el-container` 实现：

```
┌─────────────────────────────────────────────────────┐
│ 🌊 北部湾海洋生态守护站 · 运维后台   [全局搜索]   👤 管理员 ▾ │  顶栏
├────────────┬────────────────────────────────────────┤
│ 📊 数据概览 │  面包屑：首页 / 展品管理                    │
│ 🗂 展品管理 │  ┌──────────────────────────────────┐    │
│ 🔳 二维码工坊│  │            主内容卡片区              │    │
│            │  └──────────────────────────────────┘    │
│   « 折叠    │                                          │
└────────────┴────────────────────────────────────────┘
```

- 新增 `AppLayout.vue`（或改造 `App.vue`）：左侧 `el-menu`（可折叠）+ 顶栏（`el-header`，含全局搜索框、管理员下拉菜单，"退出登录"移入此处）+ `el-main`（含 `el-breadcrumb` + `router-view`）。
- 登录页 `LoginView` 不套骨架（保持独立居中卡片）。
- 侧边栏菜单项：数据概览、展品管理、二维码工坊。

### 3.2 主题落地（一处定义，全局生效）

- 新增 `admin/src/styles/theme.css`：定义 §2.1 色板为 CSS 变量，并**覆盖 Element Plus 主题变量**（`--el-color-primary` 及其 `light-3/5/7/9`、`dark-2`；`--el-color-success/warning/danger`）。在 `main.ts` 于 Element Plus CSS 之后引入。
- 清理各组件内联 hex（`App.vue` 的 `#8a6d3b/#3a2f22/#8a7d6a` 等），改用变量。
- 精修：卡片圆角/阴影、表格行高、统一 toast/确认弹窗风格、加载骨架屏、空状态。

### 3.3 数据概览页（新增 `DashboardView.vue`，路由 `/dashboard`，设为登录后默认页）

- 顶部统计卡片行：展品总数、含图片数、含音频数、含视频数、媒体完整度（%）。数据来自 `fetchExhibits()` 前端聚合（当前数据量小，无需新增云函数）。
- "最近新增/更新"列表（取列表前若干条）+ 快捷入口按钮（新增展品、去二维码工坊）。

### 3.4 展品列表增强（`ExhibitListView.vue`）

- 顶部**筛选栏**：名称/编号关键词搜索、朝代筛选（下拉）、排序（编号/名称）。前端过滤（数据量小）。
- **分页**：`el-pagination` 前端分页，替代现在硬上限展示；`getExhibits` 上限从 100 提升（见 §5.3）。
- 表格新增**多选列**（`el-table` `type="selection"`），选中后在工具栏浮出**批量操作条**（见 §4）。
- 行内操作图标化（编辑/二维码/删除）。

---

## 4. 批量运维操作（核心新增）

选中多行后，列表页浮出批量操作条，提供以下能力。二维码工坊页亦复用导出能力。

### 4.1 批量删除
- 选中 N 条 → "批量删除"→ `ElMessageBox.confirm` 显示"将删除 N 条展品，不可恢复"。
- 逐条调用现有 `deleteExhibit()`（`db.doc(_id).remove()`），并发受控（如 `Promise.allSettled` 分批），结束后汇总成功/失败数并 toast。

### 4.2 批量导出二维码
两种输出，用户选择：
1. **打包下载 ZIP**：对选中展品逐个生成小程序码（复用云函数 `getExhibitQRCode` 返回的 base64），用 `jszip` 打包为 `{exhibitId}.png`，`file-saver` 触发下载。
2. **可打印标签排版页**：新开一个打印友好视图（每个二维码 + 编号 + 名称，网格排版），调用 `window.print()`，用于打印实体标签。
- 生成过程显示进度（N/总数），失败项列出可重试。

### 4.3 批量导入（`ImportExhibitsView.vue` 或列表页弹窗向导）
分步向导：
1. **下载模板**：提供 CSV 模板，列为 `exhibitId,name,dynasty,text,image,audioUrl,videoUrl`。
2. **上传解析**：前端解析 CSV（`papaparse`）。
3. **预览校验**：表格预览每行，标红问题——必填缺失（exhibitId/name）、`exhibitId` 与库中或文件内重复；可勾选跳过错误行。
4. **确认导入**：对合法行批量 `createExhibit()`（复用现有必填校验 + 重复校验 + 字段白名单），分批并发，结束汇总成功/失败/跳过数。
- **重要约束**：图片/音频/视频为 CloudBase 云存储文件，CSV 仅支持填**已有的 `https://` 或 `cloud://` 链接**，导入过程不上传本地媒体文件。此约束在模板说明与向导界面明确标注。

### 4.4 批量设置字段（轻量，可选）
- 对选中项统一设置"朝代"（或清空某字段）。批量 `updateExhibit()`。此项优先级最低，实现成本低时纳入。

---

## 5. 架构与改动清单

### 5.1 后台新增/改动文件
- 新增：`admin/src/styles/theme.css`（色板 + Element Plus 变量覆盖）
- 新增：`admin/src/layouts/AppLayout.vue`（侧栏+顶栏骨架）
- 新增：`admin/src/views/DashboardView.vue`（数据概览）
- 新增：`admin/src/views/ImportExhibitsView.vue`（或列表页导入向导组件）
- 新增：`admin/src/components/BatchToolbar.vue`、`QrExportDialog.vue`（可选拆分）
- 改动：`admin/src/App.vue`（套用 AppLayout）、`admin/src/router/index.ts`（新增 `/dashboard`、`/import` 路由，默认跳 dashboard）、`admin/src/views/ExhibitListView.vue`（筛选/分页/多选/批量条）、`admin/src/main.ts`（引入 theme.css）
- 改动：`admin/src/cloudbase.ts`（新增批量删除/批量导入的封装；QR 批量生成复用 `fetchExhibitQRCode`）
- 新依赖：`jszip`、`file-saver`、`papaparse`（+ 类型），均为前端库，不影响后端。

### 5.2 小程序配色改动文件（仅改颜色，不动交互）
- 新增：`miniprogram/theme.wxss`（集中定义色值常量注释；WXSS 用 `var()` 需基础库支持，故采用"集中文件 + 各页 `@import`"策略，值按 §2.2 映射替换）
- 改动：`miniprogram/app.wxss`（`@import "theme.wxss"`；补充全局背景等）
- 改动：`miniprogram/pages/index/index.wxss`（7 处色值）
- 改动：`miniprogram/pages/list/list.wxss`（8 处色值）
- 改动：`miniprogram/pages/exhibit/exhibit.wxss`（12 处色值）
- 改动：`miniprogram/app.json`（`navigationBarBackgroundColor` → `#1f6f78`，`navigationBarTextStyle` → `white`）
- `pages/logs/logs.wxss` 当前无颜色，保持不动。

> WXSS 兼容性说明：微信 WXSS 支持 CSS 变量的基础库较新；为稳妥，`theme.wxss` 采用集中管理 + 直接替换真实 hex 的方式（而非依赖 `var()`），保证老基础库也生效。若确认目标基础库支持 `var()`，可升级为变量方案。

### 5.3 后端
- `cloudfunctions/getExhibits/index.js`：`limit(100)` 上限按需提升（如支持分页参数或提升到合理上限），配合前端分页。其余云函数（`getExhibitQRCode`）无需改动。
- 写操作沿用现有"SDK 直连数据库 + `auth != null` 安全规则"模式，批量操作不改变授权模型。

---

## 6. 错误处理与边界

- **批量操作部分失败**：采用 `Promise.allSettled` 分批并发，绝不静默吞错；结束后明确汇总"成功 X / 失败 Y / 跳过 Z"，失败项可查看原因并重试。
- **导入校验**：必填缺失、编号重复（库内 + 文件内）均在预览阶段标红拦截，不写入非法数据。
- **QR 批量生成**：单条失败不阻断整体，列出失败项。
- **权限失效**：批量写操作若遇未登录/规则拒绝，统一提示并引导重新登录。
- **大数据量**：当前数据量小；分页 + 前端过滤足够。若未来超量，再引入服务端分页（记为后续项，不在本次范围）。

---

## 7. 测试策略

- **后台**：以手动验收为主（该项目无前端测试框架）。验收清单：登录跳转 dashboard、侧栏导航、概览统计数正确、列表搜索/筛选/分页、多选批量删除（含部分失败）、二维码 ZIP 导出与打印排版、CSV 导入全流程（模板/解析/校验标红/导入汇总）、配色全局生效无遗留蓝色/棕色。
- **小程序**：微信开发者工具逐页目视核对配色，确认无残留棕色 hex；导航栏底色/文字色生效；扫码与详情播放交互不受影响。
- 迁移完成后全局 grep 旧 hex（`#8a6d3b` 等）确认无残留。

---

## 8. 交付顺序（供实现计划参考）

1. 海洋青蓝色板与后台主题落地（theme.css + Element Plus 变量）——立即可见的"变好看"。
2. 后台外壳（AppLayout 侧栏+顶栏）+ 数据概览页。
3. 展品列表增强（筛选/分页/多选）。
4. 批量操作：删除 → 二维码导出（ZIP + 打印）→ 批量导入向导 →（可选）批量设置字段。
5. 小程序配色统一迁移。
