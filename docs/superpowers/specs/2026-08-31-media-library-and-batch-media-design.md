# 媒体库与批量媒体运维 · 设计文档

> 日期：2026-08-31 ｜ 分支基线：`design/admin-redesign-teal-theme`（含后台改版 + 清澈海蓝配色）

## 1. 背景与目标

当前每个展品把 `image` / `audioUrl` / `videoUrl` 直接存成一串 `cloud://` 或 `https://` URL，媒体没有独立身份。这导致两个诉求互相打架：

- **单个展品维护**：编辑某展品时上传/替换它的图、视频、音频
- **批量上传**：一次性上传大量图片/视频/音频，再关联到展品

**核心设计原则**：把「媒体资产（存在哪）」与「展品记录（引用哪个资产）」解耦。媒体拥有独立记录，展品字段只保存对媒体 `fileID` 的引用（与现有存储方式向后兼容，无需改展品结构）。

**目标**：
1. 媒体拥有独立的「媒体库」，支持批量上传、检索、删除、复用
2. 批量上传后，用**文件名约定自动回填**到对应展品，最省人工
3. 单个展品编辑时，媒体字段可「上传新文件」或「从媒体库选择」
4. 全端沿用已有的海洋青蓝配色与 `runBatch` 批处理汇总

**非目标（YAGNI）**：一个展品多图相册（需改数据结构）、媒体版本管理、CDN/转码、权限分级。

## 2. 已确认的关键决策

| 决策点 | 选择 |
|---|---|
| 批量文件与展品的关联方式 | **文件名自动匹配**（文件名=展品编号） |
| 媒体元数据存储 | **新建 `media` 数据表** |
| 页面组织 | **分开的管理页**：图片管理 / 视频管理 / 音频管理（三页共用一个参数化组件） |
| 音频管理页 | **做**（图/视/音三页齐全） |
| 历史媒体回收 | **不回收**，媒体库从空开始，仅收录今后上传的 |

## 3. 数据模型：`media` 集合

云数据库新增集合 `media`，安全规则沿用 `{ read: true, write: "auth != null" }`（与 `exhibits` 一致）。

| 字段 | 类型 | 说明 |
|---|---|---|
| `_id` | string | 云数据库主键（自动） |
| `fileID` | string | `cloud://` 存储地址，即展品字段中保存的引用值 |
| `name` | string | 原始文件名（如 `exhibit-001.jpg`）——**自动匹配的钥匙** |
| `type` | `'image' \| 'video' \| 'audio'` | 由扩展名推断 |
| `size` | number | 字节数 |
| `uploadedAt` | number | 上传时间戳（写入时由客户端 `Date.now()` 赋值） |

**「被哪些展品引用」不落库**：在需要时（渲染使用角标、删除前检查）由前端扫描已加载的展品列表，用 `image / videoUrl / audioUrl === media.fileID` 即时计算。数据量小，避免引用计数的同步 bug（不重复真相）。

**类型推断规则**（扩展名，小写比对）：
- `image`：`jpg jpeg png gif webp`
- `video`：`mp4 mov m4v`
- `audio`：`mp3 m4a wav aac`

无法识别的扩展名：上传时拒绝并提示（各管理页 `accept` 已按类型限制，正常不会触发）。

## 4. 核心流程

### 4.1 批量上传进库

每个管理页顶部一个拖拽上传区（`el-upload`，`multiple`，`accept` 按页类型限制）。选中多文件后：

1. 对每个文件走 `uploadMediaToLibrary`：先 `uploadMedia`（现有函数，上传到 CloudBase 存储得到 `fileID`），再向 `media` 集合插入一条记录
2. 整批用 `runBatch(files, worker, 3, onProgress)` 并发上传，实时进度条
3. 结束后汇总「成功 N，失败 M（首个失败原因）」，刷新网格

**单个展品编辑页上传的新文件，也走同一条 `uploadMediaToLibrary` 管线** —— 单个/批量共用，上传即进库。

### 4.2 网格与单项操作

媒体以卡片网格展示：
- 缩略图（图片直接显示；视频显示首帧/占位图标；音频显示音频图标）
- 文件名、大小、上传时间
- **使用中角标**：`使用中 · N 个展品`（即时计算；0 时显示「未使用」灰标）
- 单项操作：预览、复制链接（`fileID`）、删除
- 顶部：文件名搜索、多选 + 批量删除

**删除保护**：删除某媒体前，若它被展品引用，弹二次确认并列出占用它的展品名；确认后删除 `media` 记录（存储文件可选一并 `deleteFile`，默认删）。批量删除同样先聚合占用情况再确认。

### 4.3 文件名自动关联（运维提效核心）

管理页提供「按文件名关联展品」入口。点击后：

1. 取当前库中媒体（或选中项），逐个解析文件名：去扩展名 → 得到候选 `exhibitId`
2. 与展品列表按 `exhibitId` 精确匹配
3. 扩展名类型决定写入字段：`image` 型→`image`、`video` 型→`videoUrl`、`audio` 型→`audioUrl`
4. 生成回填预览表：

   | 文件名 | 匹配展品 | 写入字段 | 当前值 | 状态 |
   |---|---|---|---|---|
   | exhibit-001.jpg | 青花瓶(001) | image | 空 | ✅ 可关联 |
   | exhibit-001.mp4 | 青花瓶(001) | videoUrl | 空 | ✅ 可关联 |
   | exhibit-007.jpg | （无此展品） | — | — | ⚠️ 未匹配，跳过 |
   | exhibit-002.jpg | 铜炉(002) | image | 已有值 | ⏭️ 默认跳过（□ 勾选覆盖） |

5. **覆盖保护**：目标字段已有值时默认「跳过」，需逐项勾选「覆盖」才写入
6. 用户审核后一键应用：对勾选项 `runBatch` 调 `updateExhibit`，把字段写为该媒体的 `fileID`
7. 汇总「成功关联 N，跳过 M」

与已有 CSV 批量导入接力：先导入展品骨架（媒体列留空）→ 批量上传按编号命名的媒体 → 一键自动回填。

### 4.4 单展品维护：从媒体库选择

增强 `MediaField.vue`：每个媒体字段除「上传新文件」外，新增「从媒体库选择」按钮 → 打开 `MediaPickerDialog`（按该字段类型过滤）→ 选中一项后把字段值设为其 `fileID`。

## 5. 页面与导航

侧边栏新增「媒体库」分组，三个子项：
- 图片管理 → `/media/images`
- 视频管理 → `/media/videos`
- 音频管理 → `/media/audios`

三页由**同一个 `MediaLibraryView.vue`** 按路由 `meta.mediaType`（`image`/`video`/`audio`）参数化渲染，满足「分开的管理页」诉求而不重复代码。路由均 `requiresAuth`。

## 6. 模块拆分

**`admin/src/types/media.ts`**（新建）
- `interface Media { _id?: string; fileID: string; name: string; type: MediaType; size: number; uploadedAt: number }`
- `type MediaType = 'image' | 'video' | 'audio'`
- `inferMediaType(filename): MediaType | null`（扩展名映射）

**`admin/src/cloudbase.ts`**（新增）
- `fetchMedia(type?: MediaType): Promise<Media[]>` —— 查询 `media` 集合，可选类型过滤，按 `uploadedAt` 倒序
- `uploadMediaToLibrary(file: File): Promise<Media>` —— `uploadMedia` + 插入 `media` 记录，返回记录
- `uploadMediaBatch(files, onProgress?): Promise<BatchResult<Media>>` —— `runBatch` 包装
- `deleteMedia(m: { _id?: string; fileID: string }, alsoDeleteFile = true): Promise<void>` —— 删记录（可选删存储文件）
- `deleteMediaBatch(items, onProgress?): Promise<BatchResult<Media>>`

**`admin/src/utils/mediaMatch.ts`**（新建，纯函数便于自测）
- `interface MatchPlanRow { media: Media; exhibit?: Exhibit; field?: 'image'|'videoUrl'|'audioUrl'; hasValue: boolean; status: 'ok'|'unmatched'|'occupied' }`
- `buildMatchPlan(mediaList: Media[], exhibits: Exhibit[]): MatchPlanRow[]`
- 应用逻辑复用 `updateExhibit` + `runBatch`

**组件**
- `admin/src/views/MediaLibraryView.vue`（复用主体：上传区 + 网格 + 搜索 + 批量删除 + 自动关联入口）
- `admin/src/components/MediaMatchDialog.vue`（回填预览表 + 覆盖勾选 + 应用）
- `admin/src/components/MediaPickerDialog.vue`（编辑页选择器）
- 增强 `admin/src/components/MediaField.vue`（加「从媒体库选择」）

**使用计数**：前端工具 `countUsage(fileID, exhibits): number`，供网格角标与删除保护共用。

## 7. 错误处理

- 所有批量操作（上传/删除/自动关联）走 `runBatch`，返回 `{ ok, failed }`，UI 汇总成功/失败并展示首个失败原因（贯彻现有约定）
- 删除占用中的媒体：二次确认 + 列出占用展品
- 自动关联：未匹配跳过、已有值默认跳过（需勾选覆盖）
- 上传：单文件失败不影响整批，逐条计入 failed
- 预览地址：沿用 `toPreviewUrl` 把 `cloud://` 换成临时可访问 URL

## 8. 测试策略（本仓库无前端测试框架）

沿用既有做法：`npm run build` 通过 + `grep` 校验 + 手动验收。`mediaMatch.ts` 为纯函数，若后续引入测试框架可优先补单测。关键手动验收：
- 批量上传 3 张图 → 网格出现 3 项、使用中为「未使用」
- 文件名 `exhibit-XXX` 命名 → 自动关联预览正确分类（可关联/未匹配/已有值），应用后展品字段回填
- 编辑页「从媒体库选择」能选中并回填
- 删除占用中媒体弹出占用展品列表

## 9. 交付分期

1. **数据模型 + API**：`media.ts` 类型、`cloudbase.ts` 媒体 API（`media` 集合需在云控制台建好并配安全规则）
2. **媒体库三页**：`MediaLibraryView` + 三路由 + 侧边栏分组 + 批量上传 + 网格 + 搜索 + 删除保护
3. **文件名自动关联**：`mediaMatch.ts` + `MediaMatchDialog` + 应用
4. **编辑页集成**：`MediaPickerDialog` + `MediaField` 增强
5. **回归**：全流程手动验收 + `npm run build`

## 10. 前置运维事项

- 在 CloudBase 云控制台**手动创建 `media` 集合**并设置安全规则 `{ read: true, write: "auth != null" }`（与 `exhibits` 一致）—— 实施前置条件，会在计划第 1 阶段的说明中标注
