# 媒体库与批量媒体运维 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给运维后台加一个独立「媒体库」，支持图片/视频/音频的批量上传、检索、复用与删除，并能按文件名自动回填到对应展品，同时保留单展品编辑时「上传新文件 / 从媒体库选择」。

**Architecture:** 把「媒体资产（存哪）」与「展品记录（引用哪个 `fileID`）」解耦。新增 `media` 云数据库集合只存元数据；展品字段仍存 `cloud://` 引用，结构不变、向后兼容。「被谁引用」不落库，由前端扫描已加载展品列表即时计算。三个管理页由同一个参数化组件按路由 `meta.mediaType` 渲染。所有批量操作复用现有 `runBatch` 汇总成功/失败。

**Tech Stack:** Vue 3 + TypeScript + Vite + Element Plus + Vue Router；CloudBase `@cloudbase/js-sdk`（SDK 直连数据库，鉴权靠安全规则 `{read:true, write:"auth != null"}`）。无前端测试框架 —— 纯函数用一次性 `node` 冒烟脚本验证，组件/集成用 `npm run build` + `grep` + 手动验收。

**基线分支：** `design/admin-redesign-teal-theme`（含后台改版 + 清澈海蓝配色 + 已提交的设计文档 `576ba2b`）。

**参考规范：** `docs/superpowers/specs/2026-08-31-media-library-and-batch-media-design.md`

**运行环境提示（每个含 `npm`/`node` 的步骤都适用）：** npm/node 不在默认 bash PATH，命令前需 `export PATH="/opt/homebrew/bin:$PATH"`。admin 工程根目录为 `admin/`。

---

## ⚠️ 前置运维事项（实施前必须完成，非代码）

在 CloudBase 云控制台**手动创建 `media` 集合**，并把安全规则设为与 `exhibits` 一致：

```json
{ "read": true, "write": "auth != null" }
```

未创建集合时，Phase 1 之后所有涉及 `media` 集合读写的手动验收都会失败（`db.collection('media')` 报集合不存在）。代码可以先写、先 build，但联调/验收需等集合就绪。此项由使用者手动完成，实施子代理无法代办 —— 若子代理在验收步骤遇到「集合不存在」错误，应报告 `DONE_WITH_CONCERNS` 并提示该前置项。

---

## 现有可复用资产（子代理必须基于这些真实签名，勿臆造）

- `admin/src/utils/batch.ts`
  - `interface BatchResult<T> { ok: T[]; failed: { item: T; error: string }[] }`
  - `runBatch<T>(items, worker: (item)=>Promise<void>, concurrency=5, onProgress?: (done,total)=>void): Promise<BatchResult<T>>`
- `admin/src/cloudbase.ts`（导出，节选）
  - `app`（模块内私有：`const app = cloudbase.init(...)`；`const db = app.database()`）
  - `uploadMedia(file: File, kind: 'image'|'audio'|'video'): Promise<string>` —— 上传到云存储，返回 `cloud://` fileID，cloudPath 形如 `exhibits/${kind}/${Date.now()}-${file.name}`
  - `toPreviewUrl(url: string): Promise<string>` —— `cloud://` 换临时 https，非 `cloud://` 原样返回
  - `fetchExhibits(): Promise<Exhibit[]>`（云函数 `getExhibits`）
  - `updateExhibit(data: Exhibit): Promise<void>`（需要 `data._id`，内部 `pickFields` 只保留白名单字段 `exhibitId,name,dynasty,image,text,audioUrl,videoUrl`）
- `admin/src/types/exhibit.ts`
  - `interface Exhibit { _id?: string; exhibitId: string; name: string; dynasty?: string; image: string; text: string; audioUrl: string; videoUrl: string }`
- `admin/src/components/MediaField.vue` —— props `{ modelValue: string; kind: 'image'|'audio'|'video'; label: string }`，emit `update:modelValue`；当前有「上传/外链」两模式
- `admin/src/router/index.ts` —— `createWebHashHistory`，路由数组，`beforeEach` 守卫按 `meta.requiresAuth` 校验 `currentUserId()`
- `admin/src/layouts/AppLayout.vue` —— 侧边栏 `el-menu`（当前三项：数据概览/展品管理/批量导入），`CRUMBS` 面包屑映射
- 配色：全部走 CSS 变量（`--ocean-primary` `#0e88ab` 等，见 `admin/src/styles/theme.css`），组件里用 `var(--ocean-*)`，勿硬编码新色值

---

# Phase 1 · 数据模型 + API

## Task 1: `media` 类型与扩展名推断

**Files:**
- Create: `admin/src/types/media.ts`
- Test（一次性冒烟脚本，验证后删除）: `admin/tmp-media-type.test.mjs`

- [ ] **Step 1: 写类型与纯函数**

创建 `admin/src/types/media.ts`：

```typescript
// 媒体库记录：与展品解耦，只存资产元数据。
// 展品字段仍存 fileID 引用，无需改展品结构。
export type MediaType = 'image' | 'video' | 'audio'

export interface Media {
  _id?: string // 云数据库主键
  fileID: string // cloud:// 存储地址，即展品字段中保存的引用值
  name: string // 原始文件名（如 exhibit-001.jpg）——自动匹配的钥匙
  type: MediaType // 由扩展名推断
  size: number // 字节数
  uploadedAt: number // 上传时间戳（写入时 Date.now()）
}

// 扩展名 → 类型；小写比对，无法识别返回 null
const EXT_MAP: Record<string, MediaType> = {
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image',
  mp4: 'video', mov: 'video', m4v: 'video',
  mp3: 'audio', m4a: 'audio', wav: 'audio', aac: 'audio',
}

/** 从文件名推断媒体类型；无扩展名或不认识返回 null。 */
export function inferMediaType(filename: string): MediaType | null {
  const dot = filename.lastIndexOf('.')
  if (dot < 0 || dot === filename.length - 1) return null
  const ext = filename.slice(dot + 1).toLowerCase()
  return EXT_MAP[ext] ?? null
}
```

- [ ] **Step 2: 写冒烟脚本并运行**

创建 `admin/tmp-media-type.test.mjs`（纯逻辑复制，因 `.ts` 不能直接 node 跑）：

```javascript
const EXT_MAP = {
  jpg:'image',jpeg:'image',png:'image',gif:'image',webp:'image',
  mp4:'video',mov:'video',m4v:'video',
  mp3:'audio',m4a:'audio',wav:'audio',aac:'audio',
}
function inferMediaType(filename){
  const dot=filename.lastIndexOf('.')
  if(dot<0||dot===filename.length-1)return null
  return EXT_MAP[filename.slice(dot+1).toLowerCase()]??null
}
const cases=[
  ['exhibit-001.jpg','image'],['a.JPEG','image'],['b.PNG','image'],
  ['c.mp4','video'],['d.MOV','video'],
  ['e.mp3','audio'],['f.m4a','audio'],
  ['noext',null],['trailing.',null],['weird.xyz',null],
]
let fail=0
for(const [f,exp] of cases){
  const got=inferMediaType(f)
  if(got!==exp){console.error('FAIL',f,'expected',exp,'got',got);fail++}
}
console.log(fail? `${fail} FAILED`:'ALL PASS')
process.exit(fail?1:0)
```

Run: `export PATH="/opt/homebrew/bin:$PATH" && node admin/tmp-media-type.test.mjs`
Expected: `ALL PASS`

- [ ] **Step 3: 删除冒烟脚本**

Run: `rm admin/tmp-media-type.test.mjs`

- [ ] **Step 4: 类型检查通过**

Run: `export PATH="/opt/homebrew/bin:$PATH" && cd admin && npm run build`
Expected: 构建成功（新文件暂未被引用，仅验证语法/类型）

- [ ] **Step 5: 提交**

```bash
git add admin/src/types/media.ts
git commit -m "feat(admin): add media type model and inferMediaType"
```

---

## Task 2: `cloudbase.ts` 媒体库 API

**Files:**
- Modify: `admin/src/cloudbase.ts`（在文件末尾「云存储」区块后追加媒体库区块）

- [ ] **Step 1: 追加媒体库 API**

在 `admin/src/cloudbase.ts` 顶部 import 补上 `Media` / `MediaType` 类型：

```typescript
import type { Media, MediaType } from './types/media'
```

在文件**末尾**追加以下区块（`app`/`db`/`uploadMedia`/`runBatch` 均已在本文件作用域内可用）：

```typescript
// ---- 媒体库（media 集合：资产元数据，与展品解耦）----
//
// 安全规则同 exhibits：{ read: true, write: "auth != null" }。
// media 集合需在云控制台手动创建（见实施计划前置事项）。

const MEDIA_COLLECTION = 'media'

/** 查询媒体库；可选按类型过滤，按上传时间倒序。 */
export async function fetchMedia(type?: MediaType): Promise<Media[]> {
  let query = db.collection(MEDIA_COLLECTION).orderBy('uploadedAt', 'desc')
  if (type) query = db.collection(MEDIA_COLLECTION).where({ type }).orderBy('uploadedAt', 'desc')
  const { data } = await query.limit(1000).get()
  return (data ?? []) as Media[]
}

/** 上传单个文件进库：先传云存储得 fileID，再写一条 media 记录。返回该记录。 */
export async function uploadMediaToLibrary(file: File): Promise<Media> {
  const type = inferMediaType(file.name)
  if (!type) throw new Error(`不支持的文件类型：${file.name}`)
  const fileID = await uploadMedia(file, type)
  const record: Media = { fileID, name: file.name, type, size: file.size, uploadedAt: Date.now() }
  const { id } = await db.collection(MEDIA_COLLECTION).add(record)
  return { ...record, _id: id as string }
}

/** 批量上传进库；单文件失败不影响整批，逐条计入 failed。 */
export async function uploadMediaBatch(
  files: File[],
  onProgress?: (d: number, t: number) => void,
): Promise<BatchResult<File>> {
  return runBatch(files, (f) => uploadMediaToLibrary(f).then(() => undefined), 3, onProgress)
}

/** 删除媒体记录；alsoDeleteFile 时一并删云存储文件（默认删）。 */
export async function deleteMedia(
  m: { _id?: string; fileID: string },
  alsoDeleteFile = true,
): Promise<void> {
  if (!m._id) throw new Error('缺少 media _id，无法删除')
  await db.collection(MEDIA_COLLECTION).doc(m._id).remove()
  if (alsoDeleteFile && m.fileID.startsWith('cloud://')) {
    await app.deleteFile({ fileList: [m.fileID] })
  }
}

/** 批量删除媒体。 */
export async function deleteMediaBatch(
  items: Media[],
  onProgress?: (d: number, t: number) => void,
): Promise<BatchResult<Media>> {
  return runBatch(items, (m) => deleteMedia({ _id: m._id, fileID: m.fileID }), 3, onProgress)
}
```

注意：`inferMediaType` 需 import。把顶部 import 改为：

```typescript
import type { Media, MediaType } from './types/media'
import { inferMediaType } from './types/media'
```

（`import type` 与值 import 分两行；`inferMediaType` 是运行期函数，不能用 `import type`。）

- [ ] **Step 2: 构建校验**

Run: `export PATH="/opt/homebrew/bin:$PATH" && cd admin && npm run build`
Expected: 构建成功，无 TS 报错

- [ ] **Step 3: grep 校验导出齐全**

Run: `grep -nE "export async function (fetchMedia|uploadMediaToLibrary|uploadMediaBatch|deleteMedia|deleteMediaBatch)" admin/src/cloudbase.ts`
Expected: 5 行全部命中

- [ ] **Step 4: 提交**

```bash
git add admin/src/cloudbase.ts
git commit -m "feat(admin): add media library CRUD API in cloudbase"
```

---

# Phase 2 · 媒体库三页

## Task 3: 使用计数工具

**Files:**
- Create: `admin/src/utils/mediaUsage.ts`
- Test（一次性冒烟脚本）: `admin/tmp-usage.test.mjs`

**说明：** 「被哪些展品引用」不落库，由前端扫描展品列表即时算。此工具供网格角标与删除保护共用。展品的图片存在 `image` 字段，音视频存在 `audioUrl`/`videoUrl`。

- [ ] **Step 1: 写工具**

创建 `admin/src/utils/mediaUsage.ts`：

```typescript
import type { Exhibit } from '../types/exhibit'

// 展品里可能引用媒体的三个字段
const REF_FIELDS: (keyof Exhibit)[] = ['image', 'audioUrl', 'videoUrl']

/** 返回引用了该 fileID 的展品列表（任意字段命中即算）。 */
export function usedByExhibits(fileID: string, exhibits: Exhibit[]): Exhibit[] {
  if (!fileID) return []
  return exhibits.filter((e) => REF_FIELDS.some((f) => e[f] === fileID))
}

/** 引用该 fileID 的展品数量。 */
export function countUsage(fileID: string, exhibits: Exhibit[]): number {
  return usedByExhibits(fileID, exhibits).length
}
```

- [ ] **Step 2: 冒烟脚本并运行**

创建 `admin/tmp-usage.test.mjs`：

```javascript
const REF=['image','audioUrl','videoUrl']
function usedByExhibits(fileID,exhibits){
  if(!fileID)return[]
  return exhibits.filter(e=>REF.some(f=>e[f]===fileID))
}
function countUsage(id,ex){return usedByExhibits(id,ex).length}
const ex=[
  {exhibitId:'001',image:'cloud://a',audioUrl:'',videoUrl:''},
  {exhibitId:'002',image:'cloud://a',audioUrl:'cloud://b',videoUrl:''},
  {exhibitId:'003',image:'',audioUrl:'',videoUrl:'cloud://c'},
]
let fail=0
const check=(got,exp,msg)=>{if(got!==exp){console.error('FAIL',msg,'exp',exp,'got',got);fail++}}
check(countUsage('cloud://a',ex),2,'a used by 2')
check(countUsage('cloud://b',ex),1,'b used by 1')
check(countUsage('cloud://c',ex),1,'c used by 1')
check(countUsage('cloud://none',ex),0,'none unused')
check(countUsage('',ex),0,'empty id -> 0')
check(usedByExhibits('cloud://a',ex).map(e=>e.exhibitId).join(','),'001,002','a exhibits')
console.log(fail?`${fail} FAILED`:'ALL PASS')
process.exit(fail?1:0)
```

Run: `export PATH="/opt/homebrew/bin:$PATH" && node admin/tmp-usage.test.mjs`
Expected: `ALL PASS`

- [ ] **Step 3: 删除脚本并构建**

Run: `rm admin/tmp-usage.test.mjs && export PATH="/opt/homebrew/bin:$PATH" && cd admin && npm run build`
Expected: 构建成功

- [ ] **Step 4: 提交**

```bash
git add admin/src/utils/mediaUsage.ts
git commit -m "feat(admin): add media usage count util"
```

---

## Task 4: 媒体库页面 + 路由 + 侧边栏

**Files:**
- Create: `admin/src/views/MediaLibraryView.vue`
- Modify: `admin/src/router/index.ts`（新增三条路由）
- Modify: `admin/src/layouts/AppLayout.vue`（侧边栏加媒体库分组 + 面包屑映射）

**说明：** 一个参数化组件，按路由 `meta.mediaType` 渲染图/视/音三页。本任务只做：批量上传区、卡片网格（缩略图/文件名/大小/时间/使用中角标）、文件名搜索、多选 + 批量删除、删除保护二次确认。**自动关联入口留到 Task 6。**

- [ ] **Step 1: 新增三条路由**

在 `admin/src/router/index.ts` 的 `routes` 数组内、`/import` 路由之后加入：

```typescript
    {
      path: '/media/images',
      name: 'media-images',
      component: () => import('../views/MediaLibraryView.vue'),
      meta: { requiresAuth: true, mediaType: 'image' },
    },
    {
      path: '/media/videos',
      name: 'media-videos',
      component: () => import('../views/MediaLibraryView.vue'),
      meta: { requiresAuth: true, mediaType: 'video' },
    },
    {
      path: '/media/audios',
      name: 'media-audios',
      component: () => import('../views/MediaLibraryView.vue'),
      meta: { requiresAuth: true, mediaType: 'audio' },
    },
```

- [ ] **Step 2: 侧边栏加媒体库分组 + 面包屑**

在 `admin/src/layouts/AppLayout.vue` 的 `el-menu` 内，「批量导入」项之后加入一个 `el-sub-menu`：

```vue
        <el-sub-menu index="media">
          <template #title><el-icon><PictureFilled /></el-icon><span>媒体库</span></template>
          <el-menu-item index="/media/images">图片管理</el-menu-item>
          <el-menu-item index="/media/videos">视频管理</el-menu-item>
          <el-menu-item index="/media/audios">音频管理</el-menu-item>
        </el-sub-menu>
```

`script setup` 里图标 import 追加 `PictureFilled`：

```typescript
import { DataLine, Files, Upload, PictureFilled } from '@element-plus/icons-vue'
```

`activeMenu` 当前是 `'/' + route.path.split('/')[1]`，对 `/media/images` 会得到 `/media`，与子菜单项 index `/media/images` 不匹配导致高亮丢失。改为用完整路径：

```typescript
const activeMenu = computed(() => route.path)
```

面包屑 `CRUMBS` 映射追加媒体三页（键用 path 段更简单，改成按 name 或完整 path）。将 `crumb` 计算改为：

```typescript
const CRUMBS: Record<string, string> = {
  '/dashboard': '数据概览',
  '/exhibits': '展品管理',
  '/import': '批量导入',
  '/media/images': '图片管理',
  '/media/videos': '视频管理',
  '/media/audios': '音频管理',
}
const crumb = computed(() => CRUMBS[route.path] || '展品管理')
```

（同时删除旧的按 `split('/')[1]` 的 `CRUMBS` 定义与 `crumb`，避免重复声明。）

- [ ] **Step 3: 写 MediaLibraryView.vue**

创建 `admin/src/views/MediaLibraryView.vue`：

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadRawFile } from 'element-plus'
import {
  fetchMedia, uploadMediaBatch, deleteMedia, deleteMediaBatch,
  fetchExhibits, toPreviewUrl,
} from '../cloudbase'
import type { Media, MediaType } from '../types/media'
import type { Exhibit } from '../types/exhibit'
import { countUsage, usedByExhibits } from '../utils/mediaUsage'

const route = useRoute()
const mediaType = computed(() => route.meta.mediaType as MediaType)

const TYPE_LABEL: Record<MediaType, string> = { image: '图片', video: '视频', audio: '音频' }
const ACCEPT: Record<MediaType, string> = { image: 'image/*', video: 'video/*', audio: 'audio/*' }
const label = computed(() => TYPE_LABEL[mediaType.value])

const loading = ref(false)
const list = ref<Media[]>([])
const exhibits = ref<Exhibit[]>([])
const keyword = ref('')
const selected = ref<Media[]>([])
const uploading = ref(false)
const progress = ref(0)
const previews = ref<Record<string, string>>({}) // fileID -> 临时 url（仅图片）

const filtered = computed(() =>
  list.value.filter((m) => m.name.toLowerCase().includes(keyword.value.trim().toLowerCase())),
)

async function load() {
  loading.value = true
  try {
    const [media, exs] = await Promise.all([fetchMedia(mediaType.value), fetchExhibits()])
    list.value = media
    exhibits.value = exs
    // 图片预览批量换临时 url（视频/音频点开再换，避免一次性请求过多）
    if (mediaType.value === 'image') {
      const entries = await Promise.all(
        media.map(async (m) => [m.fileID, await toPreviewUrl(m.fileID)] as const),
      )
      previews.value = Object.fromEntries(entries)
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载失败')
  } finally {
    loading.value = false
  }
}

// el-upload before-upload：收集文件，阻止自动上传，改为整批 runBatch
const pending: File[] = []
function collectFile(file: UploadRawFile) {
  pending.push(file)
  return false
}
async function runUpload() {
  if (!pending.length) return
  const files = pending.splice(0)
  uploading.value = true
  progress.value = 0
  try {
    const res = await uploadMediaBatch(files, (d, t) => (progress.value = Math.round((d / t) * 100)))
    if (res.failed.length) {
      ElMessage.warning(`上传完成：成功 ${res.ok.length}，失败 ${res.failed.length}（${res.failed[0].error}）`)
    } else {
      ElMessage.success(`上传成功 ${res.ok.length} 个`)
    }
    await load()
  } finally {
    uploading.value = false
  }
}

function usageText(m: Media): string {
  const n = countUsage(m.fileID, exhibits.value)
  return n > 0 ? `使用中 · ${n} 个展品` : '未使用'
}

async function copyId(m: Media) {
  await navigator.clipboard.writeText(m.fileID)
  ElMessage.success('已复制 fileID')
}

async function confirmUsage(items: Media[]): Promise<boolean> {
  const occupied = items
    .map((m) => ({ m, users: usedByExhibits(m.fileID, exhibits.value) }))
    .filter((x) => x.users.length > 0)
  if (occupied.length) {
    const lines = occupied
      .map((x) => `${x.m.name} → ${x.users.map((e) => e.name).join('、')}`)
      .join('\n')
    try {
      await ElMessageBox.confirm(
        `以下媒体正被展品引用，删除后展品将失去该资源：\n\n${lines}\n\n确认删除？`,
        '删除确认', { type: 'warning', confirmButtonText: '仍然删除', cancelButtonText: '取消' },
      )
    } catch {
      return false
    }
  }
  return true
}

async function onDeleteOne(m: Media) {
  if (!(await confirmUsage([m]))) return
  try {
    await deleteMedia({ _id: m._id, fileID: m.fileID })
    ElMessage.success('已删除')
    await load()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '删除失败')
  }
}

async function onDeleteSelected() {
  if (!selected.value.length) return
  if (!(await confirmUsage(selected.value))) return
  const res = await deleteMediaBatch(selected.value)
  if (res.failed.length) {
    ElMessage.warning(`删除完成：成功 ${res.ok.length}，失败 ${res.failed.length}（${res.failed[0].error}）`)
  } else {
    ElMessage.success(`已删除 ${res.ok.length} 个`)
  }
  selected.value = []
  await load()
}

function toggleSelect(m: Media) {
  const i = selected.value.findIndex((x) => x._id === m._id)
  if (i >= 0) selected.value.splice(i, 1)
  else selected.value.push(m)
}
function isSelected(m: Media) {
  return selected.value.some((x) => x._id === m._id)
}

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

onMounted(load)
</script>

<template>
  <div class="media-lib" v-loading="loading">
    <div class="lib-head">
      <h2 class="lib-title">{{ label }}管理</h2>
      <div class="lib-actions">
        <el-input v-model="keyword" placeholder="按文件名搜索" clearable style="width: 220px" />
        <el-button v-if="selected.length" type="danger" plain @click="onDeleteSelected">
          删除选中（{{ selected.length }}）
        </el-button>
      </div>
    </div>

    <el-upload
      class="lib-upload"
      drag multiple
      :accept="ACCEPT[mediaType]"
      :show-file-list="false"
      :before-upload="collectFile"
      :on-change="() => {}"
    >
      <div class="upload-inner">
        <el-icon class="upload-icon"><UploadFilled /></el-icon>
        <div>把{{ label }}拖到这里，或<em>点击选择</em>（可多选）</div>
      </div>
    </el-upload>
    <div class="upload-bar">
      <el-button type="primary" :loading="uploading" @click="runUpload">开始上传</el-button>
      <el-progress v-if="uploading" :percentage="progress" style="flex: 1" />
    </div>

    <div v-if="!filtered.length" class="lib-empty">暂无{{ label }}，先上传一些吧</div>
    <div v-else class="lib-grid">
      <div
        v-for="m in filtered" :key="m._id"
        class="card" :class="{ 'card-sel': isSelected(m) }"
        @click="toggleSelect(m)"
      >
        <div class="thumb">
          <el-image
            v-if="mediaType === 'image' && previews[m.fileID]"
            :src="previews[m.fileID]" fit="cover" style="width: 100%; height: 100%"
          />
          <el-icon v-else-if="mediaType === 'video'" class="thumb-icon"><VideoCamera /></el-icon>
          <el-icon v-else class="thumb-icon"><Headset /></el-icon>
          <el-checkbox class="card-check" :model-value="isSelected(m)" @click.stop="toggleSelect(m)" />
        </div>
        <div class="card-name" :title="m.name">{{ m.name }}</div>
        <div class="card-meta">{{ fmtSize(m.size) }}</div>
        <div class="card-usage" :class="{ used: countUsage(m.fileID, exhibits) > 0 }">
          {{ usageText(m) }}
        </div>
        <div class="card-ops" @click.stop>
          <el-button link size="small" @click="copyId(m)">复制链接</el-button>
          <el-button link size="small" type="danger" @click="onDeleteOne(m)">删除</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// 图标注册（Element Plus 图标需显式 import）
import { UploadFilled, VideoCamera, Headset } from '@element-plus/icons-vue'
export default { components: { UploadFilled, VideoCamera, Headset } }
</script>

<style scoped>
.lib-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.lib-title { color: var(--ocean-text-strong); }
.lib-actions { display: flex; gap: 8px; align-items: center; }
.lib-upload { display: block; }
.upload-inner { padding: 16px; color: var(--ocean-text-body); }
.upload-icon { font-size: 40px; color: var(--ocean-primary); }
.upload-bar { display: flex; align-items: center; gap: 12px; margin: 12px 0 20px; }
.lib-empty { text-align: center; color: var(--ocean-text-muted); padding: 48px 0; }
.lib-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
.card {
  border: 1px solid var(--ocean-border); border-radius: 10px; padding: 8px;
  cursor: pointer; transition: box-shadow .15s; background: var(--ocean-surface);
}
.card:hover { box-shadow: 0 2px 10px var(--ocean-shadow); }
.card-sel { border-color: var(--ocean-primary); box-shadow: 0 0 0 2px var(--ocean-primary-bg); }
.thumb {
  position: relative; width: 100%; height: 120px; border-radius: 8px; overflow: hidden;
  background: var(--ocean-placeholder); display: flex; align-items: center; justify-content: center;
}
.thumb-icon { font-size: 44px; color: var(--ocean-primary); }
.card-check { position: absolute; top: 6px; left: 6px; }
.card-name { font-size: 13px; color: var(--ocean-text-strong); margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-meta { font-size: 12px; color: var(--ocean-text-muted); }
.card-usage { font-size: 12px; color: var(--ocean-text-hint); }
.card-usage.used { color: var(--ocean-primary); }
.card-ops { display: flex; justify-content: space-between; margin-top: 4px; }
</style>
```

**注意（子代理留意）：** 上面为了图标注册用了两个 `<script>` 块（`setup` + 普通）。若与 `<el-icon><UploadFilled /></el-icon>` 模板用法冲突，改为在 `<script setup>` 内直接 `import { UploadFilled, VideoCamera, Headset } from '@element-plus/icons-vue'`（setup 顶层 import 的组件模板可直接用），并删除底部普通 `<script>` 块。以能通过 `npm run build` 为准。

- [ ] **Step 4: 构建校验**

Run: `export PATH="/opt/homebrew/bin:$PATH" && cd admin && npm run build`
Expected: 构建成功

- [ ] **Step 5: grep 校验路由与菜单**

Run: `grep -n "media/images\|media/videos\|media/audios" admin/src/router/index.ts admin/src/layouts/AppLayout.vue`
Expected: 路由文件 3 处、布局文件 3 处

- [ ] **Step 6: 提交**

```bash
git add admin/src/views/MediaLibraryView.vue admin/src/router/index.ts admin/src/layouts/AppLayout.vue
git commit -m "feat(admin): media library pages with upload, grid, search, batch delete"
```

---

# Phase 3 · 文件名自动关联

## Task 5: `mediaMatch.ts` 回填计划纯函数

**Files:**
- Create: `admin/src/utils/mediaMatch.ts`
- Test（一次性冒烟脚本）: `admin/tmp-match.test.mjs`

**说明：** 解析文件名 → 去扩展名得候选 `exhibitId` → 与展品精确匹配 → 扩展名类型决定写入字段（image→`image`，video→`videoUrl`，audio→`audioUrl`）→ 标注状态。纯函数，不触发写库；应用逻辑在组件里用 `updateExhibit` + `runBatch`。

- [ ] **Step 1: 写纯函数**

创建 `admin/src/utils/mediaMatch.ts`：

```typescript
import type { Media, MediaType } from '../types/media'
import type { Exhibit } from '../types/exhibit'

// 媒体类型 → 写入的展品字段
const TYPE_FIELD: Record<MediaType, 'image' | 'videoUrl' | 'audioUrl'> = {
  image: 'image', video: 'videoUrl', audio: 'audioUrl',
}

export interface MatchPlanRow {
  media: Media
  exhibit?: Exhibit
  field?: 'image' | 'videoUrl' | 'audioUrl'
  hasValue: boolean // 目标字段是否已有值
  status: 'ok' | 'unmatched' | 'occupied' // 可关联 / 未匹配 / 已有值默认跳过
}

/** 去扩展名得到候选 exhibitId。 */
export function stripExt(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot > 0 ? filename.slice(0, dot) : filename
}

/**
 * 按文件名生成回填预览。
 * - 无匹配展品 → status 'unmatched'
 * - 目标字段已有值 → status 'occupied'（默认跳过，需勾选覆盖）
 * - 否则 → status 'ok'
 */
export function buildMatchPlan(mediaList: Media[], exhibits: Exhibit[]): MatchPlanRow[] {
  const byId = new Map(exhibits.map((e) => [e.exhibitId, e]))
  return mediaList.map((media) => {
    const candidate = stripExt(media.name)
    const exhibit = byId.get(candidate)
    if (!exhibit) return { media, hasValue: false, status: 'unmatched' as const }
    const field = TYPE_FIELD[media.type]
    const hasValue = !!exhibit[field]
    return { media, exhibit, field, hasValue, status: hasValue ? 'occupied' as const : 'ok' as const }
  })
}
```

- [ ] **Step 2: 冒烟脚本并运行**

创建 `admin/tmp-match.test.mjs`：

```javascript
const TYPE_FIELD={image:'image',video:'videoUrl',audio:'audioUrl'}
function stripExt(f){const d=f.lastIndexOf('.');return d>0?f.slice(0,d):f}
function buildMatchPlan(media,exhibits){
  const byId=new Map(exhibits.map(e=>[e.exhibitId,e]))
  return media.map(m=>{
    const ex=byId.get(stripExt(m.name))
    if(!ex)return{media:m,hasValue:false,status:'unmatched'}
    const field=TYPE_FIELD[m.type]
    const hasValue=!!ex[field]
    return{media:m,exhibit:ex,field,hasValue,status:hasValue?'occupied':'ok'}
  })
}
const exhibits=[
  {exhibitId:'exhibit-001',image:'',audioUrl:'',videoUrl:''},
  {exhibitId:'exhibit-002',image:'cloud://old',audioUrl:'',videoUrl:''},
]
const media=[
  {name:'exhibit-001.jpg',type:'image'},
  {name:'exhibit-001.mp4',type:'video'},
  {name:'exhibit-007.jpg',type:'image'},
  {name:'exhibit-002.jpg',type:'image'},
]
const plan=buildMatchPlan(media,exhibits)
let fail=0
const check=(g,e,m)=>{if(g!==e){console.error('FAIL',m,'exp',e,'got',g);fail++}}
check(plan[0].status,'ok','001.jpg ok')
check(plan[0].field,'image','001.jpg -> image')
check(plan[1].status,'ok','001.mp4 ok')
check(plan[1].field,'videoUrl','001.mp4 -> videoUrl')
check(plan[2].status,'unmatched','007 unmatched')
check(plan[3].status,'occupied','002.jpg occupied')
check(plan[3].hasValue,true,'002.jpg hasValue')
check(stripExt('a.b.jpg'),'a.b','multi-dot strip')
console.log(fail?`${fail} FAILED`:'ALL PASS')
process.exit(fail?1:0)
```

Run: `export PATH="/opt/homebrew/bin:$PATH" && node admin/tmp-match.test.mjs`
Expected: `ALL PASS`

- [ ] **Step 3: 删脚本并构建**

Run: `rm admin/tmp-match.test.mjs && export PATH="/opt/homebrew/bin:$PATH" && cd admin && npm run build`
Expected: 构建成功

- [ ] **Step 4: 提交**

```bash
git add admin/src/utils/mediaMatch.ts
git commit -m "feat(admin): add buildMatchPlan for filename auto-match"
```

---

## Task 6: 自动关联对话框 + 接入媒体库页

**Files:**
- Create: `admin/src/components/MediaMatchDialog.vue`
- Modify: `admin/src/views/MediaLibraryView.vue`（加「按文件名关联展品」按钮 + 挂载对话框）

**说明：** 对话框接收当前库媒体 + 展品列表，展示回填预览表；`ok` 默认勾选、`occupied` 默认不勾（勾选即覆盖）、`unmatched` 不可勾。用户确认后对勾选项 `runBatch` 调 `updateExhibit`（把 `field` 写为 `media.fileID`），汇总成功/跳过。应用成功后 `emit('applied')` 让父页刷新。

- [ ] **Step 1: 写对话框组件**

创建 `admin/src/components/MediaMatchDialog.vue`：

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { updateExhibit } from '../cloudbase'
import { runBatch } from '../utils/batch'
import { buildMatchPlan, type MatchPlanRow } from '../utils/mediaMatch'
import type { Media } from '../types/media'
import type { Exhibit } from '../types/exhibit'

const props = defineProps<{
  modelValue: boolean
  mediaList: Media[]
  exhibits: Exhibit[]
}>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean]; applied: [] }>()

const rows = ref<MatchPlanRow[]>([])
// 勾选：默认 ok 勾、occupied 不勾、unmatched 不可勾
const checked = ref<Record<string, boolean>>({})
const applying = ref(false)

const STATUS_TEXT: Record<MatchPlanRow['status'], string> = {
  ok: '可关联', unmatched: '未匹配，跳过', occupied: '已有值（勾选覆盖）',
}

function rebuild() {
  rows.value = buildMatchPlan(props.mediaList, props.exhibits)
  const init: Record<string, boolean> = {}
  for (const r of rows.value) {
    if (r.media._id) init[r.media._id] = r.status === 'ok'
  }
  checked.value = init
}
watch(() => props.modelValue, (v) => { if (v) rebuild() })

const selectableCount = computed(() =>
  rows.value.filter((r) => r.status !== 'unmatched' && r.media._id && checked.value[r.media._id]).length,
)

async function apply() {
  const targets = rows.value.filter(
    (r) => r.status !== 'unmatched' && r.exhibit && r.field && r.media._id && checked.value[r.media._id],
  )
  if (!targets.length) { ElMessage.info('没有勾选任何可关联项'); return }
  applying.value = true
  try {
    const res = await runBatch(targets, async (r) => {
      await updateExhibit({ ...(r.exhibit as Exhibit), [r.field as string]: r.media.fileID })
    }, 5)
    const skipped = rows.value.length - targets.length
    if (res.failed.length) {
      ElMessage.warning(`关联完成：成功 ${res.ok.length}，失败 ${res.failed.length}（${res.failed[0].error}），跳过 ${skipped}`)
    } else {
      ElMessage.success(`成功关联 ${res.ok.length}，跳过 ${skipped}`)
    }
    emit('applied')
    emit('update:modelValue', false)
  } finally {
    applying.value = false
  }
}

function close() { emit('update:modelValue', false) }
</script>

<template>
  <el-dialog
    :model-value="modelValue" title="按文件名关联展品" width="720px"
    @update:model-value="close"
  >
    <p class="hint">文件名（去扩展名）= 展品编号即可自动匹配；已有值默认跳过，需勾选「覆盖」。</p>
    <el-table :data="rows" max-height="420">
      <el-table-column width="52">
        <template #default="{ row }">
          <el-checkbox
            v-if="row.status !== 'unmatched' && row.media._id"
            v-model="checked[row.media._id]"
          />
        </template>
      </el-table-column>
      <el-table-column prop="media.name" label="文件名" min-width="160" />
      <el-table-column label="匹配展品" min-width="160">
        <template #default="{ row }">
          <span v-if="row.exhibit">{{ row.exhibit.name }}（{{ row.exhibit.exhibitId }}）</span>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="field" label="写入字段" width="100">
        <template #default="{ row }">{{ row.field || '—' }}</template>
      </el-table-column>
      <el-table-column label="当前值" width="90">
        <template #default="{ row }">
          <span :class="{ muted: !row.hasValue }">{{ row.hasValue ? '已有值' : '空' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="140">
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'ok' ? 'success' : row.status === 'occupied' ? 'warning' : 'info'"
            size="small"
          >{{ STATUS_TEXT[row.status] }}</el-tag>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="applying" @click="apply">
        应用（{{ selectableCount }}）
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.hint { color: var(--ocean-text-muted); font-size: 13px; margin-bottom: 8px; }
.muted { color: var(--ocean-text-hint); }
</style>
```

- [ ] **Step 2: 接入媒体库页**

在 `admin/src/views/MediaLibraryView.vue` 中：

`import` 追加：

```typescript
import MediaMatchDialog from '../components/MediaMatchDialog.vue'
```

`script setup` 加状态：

```typescript
const matchOpen = ref(false)
```

模板 `.lib-actions` 里，搜索框之后加按钮：

```vue
        <el-button type="primary" plain @click="matchOpen = true">按文件名关联展品</el-button>
```

模板根 `div` 内末尾（`.lib-grid` 之后）挂载对话框：

```vue
    <MediaMatchDialog
      v-model="matchOpen"
      :media-list="list"
      :exhibits="exhibits"
      @applied="load"
    />
```

- [ ] **Step 3: 构建校验**

Run: `export PATH="/opt/homebrew/bin:$PATH" && cd admin && npm run build`
Expected: 构建成功

- [ ] **Step 4: grep 校验接入**

Run: `grep -n "MediaMatchDialog\|matchOpen" admin/src/views/MediaLibraryView.vue`
Expected: import、状态、模板按钮、模板挂载共命中多处

- [ ] **Step 5: 提交**

```bash
git add admin/src/components/MediaMatchDialog.vue admin/src/views/MediaLibraryView.vue
git commit -m "feat(admin): filename auto-match dialog with override protection"
```

---

# Phase 4 · 编辑页集成

## Task 7: 媒体选择器对话框

**Files:**
- Create: `admin/src/components/MediaPickerDialog.vue`

**说明：** 按 `kind` 过滤媒体库，网格展示（复用与库页一致的卡片风格），选中一项 `emit('pick', fileID)` 并关闭。

- [ ] **Step 1: 写选择器组件**

创建 `admin/src/components/MediaPickerDialog.vue`：

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchMedia, toPreviewUrl } from '../cloudbase'
import type { Media } from '../types/media'

const props = defineProps<{
  modelValue: boolean
  kind: 'image' | 'video' | 'audio'
}>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean]; pick: [fileID: string] }>()

const loading = ref(false)
const list = ref<Media[]>([])
const previews = ref<Record<string, string>>({})
const keyword = ref('')

async function load() {
  loading.value = true
  try {
    list.value = await fetchMedia(props.kind)
    if (props.kind === 'image') {
      const entries = await Promise.all(
        list.value.map(async (m) => [m.fileID, await toPreviewUrl(m.fileID)] as const),
      )
      previews.value = Object.fromEntries(entries)
    }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载失败')
  } finally {
    loading.value = false
  }
}
watch(() => props.modelValue, (v) => { if (v) { keyword.value = ''; load() } })

function pick(m: Media) {
  emit('pick', m.fileID)
  emit('update:modelValue', false)
}
function close() { emit('update:modelValue', false) }
</script>

<template>
  <el-dialog
    :model-value="modelValue" title="从媒体库选择" width="720px"
    @update:model-value="close"
  >
    <el-input v-model="keyword" placeholder="按文件名搜索" clearable style="width: 220px; margin-bottom: 12px" />
    <div v-loading="loading" class="picker-grid">
      <div
        v-for="m in list.filter(x => x.name.toLowerCase().includes(keyword.trim().toLowerCase()))"
        :key="m._id" class="pick-card" @click="pick(m)"
      >
        <div class="pick-thumb">
          <el-image
            v-if="kind === 'image' && previews[m.fileID]"
            :src="previews[m.fileID]" fit="cover" style="width: 100%; height: 100%"
          />
          <el-icon v-else-if="kind === 'video'" class="pick-icon"><VideoCamera /></el-icon>
          <el-icon v-else class="pick-icon"><Headset /></el-icon>
        </div>
        <div class="pick-name" :title="m.name">{{ m.name }}</div>
      </div>
    </div>
    <div v-if="!loading && !list.length" class="pick-empty">媒体库暂无{{ kind === 'image' ? '图片' : kind === 'video' ? '视频' : '音频' }}</div>
  </el-dialog>
</template>

<script lang="ts">
import { VideoCamera, Headset } from '@element-plus/icons-vue'
export default { components: { VideoCamera, Headset } }
</script>

<style scoped>
.picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; min-height: 120px; }
.pick-card { border: 1px solid var(--ocean-border); border-radius: 8px; padding: 6px; cursor: pointer; }
.pick-card:hover { border-color: var(--ocean-primary); box-shadow: 0 2px 8px var(--ocean-shadow); }
.pick-thumb { height: 100px; border-radius: 6px; overflow: hidden; background: var(--ocean-placeholder); display: flex; align-items: center; justify-content: center; }
.pick-icon { font-size: 40px; color: var(--ocean-primary); }
.pick-name { font-size: 12px; color: var(--ocean-text-strong); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pick-empty { text-align: center; color: var(--ocean-text-muted); padding: 32px 0; }
</style>
```

同 Task 4 注意事项：若双 `<script>` 图标注册引发构建问题，改为在 `<script setup>` 顶层直接 import 图标并删底部块，以 `npm run build` 通过为准。

- [ ] **Step 2: 构建校验**

Run: `export PATH="/opt/homebrew/bin:$PATH" && cd admin && npm run build`
Expected: 构建成功

- [ ] **Step 3: 提交**

```bash
git add admin/src/components/MediaPickerDialog.vue
git commit -m "feat(admin): media picker dialog for exhibit editor"
```

---

## Task 8: 增强 `MediaField.vue`

**Files:**
- Modify: `admin/src/components/MediaField.vue`

**说明：** 在原有「上传 / 外链」基础上加第三个入口「从媒体库选择」，打开 `MediaPickerDialog`（按 `kind` 过滤），选中即把字段值设为其 `fileID`。编辑页上传的新文件也应进库 —— 把 `onFile` 从 `uploadMedia` 切到 `uploadMediaToLibrary`（上传即进库，返回记录取 `fileID`）。

- [ ] **Step 1: 改 script**

在 `admin/src/components/MediaField.vue` 的 `<script setup>` 中：

import 改为（用进库函数替代裸上传）：

```typescript
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadMediaToLibrary, toPreviewUrl } from '../cloudbase'
import MediaPickerDialog from './MediaPickerDialog.vue'
```

`mode` 单选加入 `library`；新增选择器开关：

```typescript
const mode = ref<'upload' | 'library' | 'url'>('upload')
const pickerOpen = ref(false)
```

`onFile` 内上传改用进库函数：

```typescript
async function onFile(file: File) {
  uploading.value = true
  try {
    const media = await uploadMediaToLibrary(file)
    emit('update:modelValue', media.fileID)
    ElMessage.success(`${props.label}上传成功，已存入媒体库`)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '上传失败')
  } finally {
    uploading.value = false
  }
  return false
}
```

新增选中回调：

```typescript
function onPick(fileID: string) {
  emit('update:modelValue', fileID)
  ElMessage.success(`${props.label}已从媒体库选择`)
}
```

- [ ] **Step 2: 改 template**

`el-radio-group` 加一个按钮：

```vue
    <el-radio-group v-model="mode" size="small">
      <el-radio-button value="upload">上传</el-radio-button>
      <el-radio-button value="library">媒体库</el-radio-button>
      <el-radio-button value="url">外链</el-radio-button>
    </el-radio-group>
```

`.media-body` 内，`upload` 分支与 `url` 分支之间加 `library` 分支：

```vue
      <el-button v-else-if="mode === 'library'" @click="pickerOpen = true">从媒体库选择</el-button>
```

（原 `el-input` 外链分支的 `v-if="mode==='upload'"`/`v-else` 结构需相应调整为 `v-if / v-else-if / v-else` 三分支：upload 用 `v-if`，library 用 `v-else-if`，url 用 `v-else`。）

模板末尾（根 `.media-field` 内）挂载选择器：

```vue
    <MediaPickerDialog v-model="pickerOpen" :kind="kind" @pick="onPick" />
```

- [ ] **Step 3: 构建校验**

Run: `export PATH="/opt/homebrew/bin:$PATH" && cd admin && npm run build`
Expected: 构建成功

- [ ] **Step 4: grep 校验**

Run: `grep -n "uploadMediaToLibrary\|MediaPickerDialog\|从媒体库选择" admin/src/components/MediaField.vue`
Expected: import、模板按钮、挂载均命中

- [ ] **Step 5: 提交**

```bash
git add admin/src/components/MediaField.vue
git commit -m "feat(admin): MediaField supports pick-from-library and upload-to-library"
```

---

# Phase 5 · 回归

## Task 9: 全流程构建 + 手动验收清单

**Files:** 无代码改动（除非发现缺陷需回补）

- [ ] **Step 1: 全量构建**

Run: `export PATH="/opt/homebrew/bin:$PATH" && cd admin && npm run build`
Expected: 构建成功，无 TS/模板错误

- [ ] **Step 2: grep 复核关键连接点**

Run（应全部命中）:
```bash
grep -rn "uploadMediaToLibrary" admin/src/
grep -rn "buildMatchPlan" admin/src/
grep -rn "countUsage" admin/src/
grep -n "media/images\|media/videos\|media/audios" admin/src/router/index.ts
```

- [ ] **Step 3: 手动验收清单（需 `media` 集合已在云控制台建好 + 本地 `npm run dev` 登录后）**

> 若 `media` 集合未建，读写会报「集合不存在」；先完成前置运维事项。

- [ ] 图片管理页：拖拽/选择 3 张图 → 开始上传 → 进度到 100% → 网格出现 3 项，使用中显示「未使用」
- [ ] 视频/音频页：同样能上传，缩略图显示对应占位图标
- [ ] 文件名搜索能过滤网格
- [ ] 用 `exhibit-XXX.jpg` 命名的图 → 「按文件名关联展品」→ 预览表分类正确（可关联/未匹配/已有值），未匹配不可勾、已有值需勾选覆盖 → 应用 → 汇总「成功 N，跳过 M」→ 对应展品 `image` 字段回填该 fileID
- [ ] 编辑某展品 → 图片字段「媒体库」→ 选择器按类型过滤 → 选中回填；「上传」新文件后该文件也出现在媒体库
- [ ] 删除一个被展品引用的媒体 → 弹出占用展品名二次确认；确认后网格移除
- [ ] 多选 + 批量删除 → 汇总成功/失败

- [ ] **Step 4: 提交（若有回补修复）**

```bash
git add -A && git commit -m "fix(admin): media library regression fixes"
```

若无改动则跳过提交。

---

## Self-Review（作者已核对）

- **Spec 覆盖**：数据模型（Task 1-2）、三管理页+导航（Task 4）、批量上传（Task 4）、网格+使用角标+删除保护（Task 3-4）、文件名自动关联（Task 5-6）、编辑页从库选择+上传进库（Task 7-8）、错误处理（全程 `runBatch` 汇总）、测试策略（纯函数冒烟 + build + grep + 手动）、前置运维（顶部专节 + Task 9 提示）—— 均有对应任务。
- **占位符**：无 TBD/TODO；每个改代码步骤含完整代码。
- **类型一致**：`Media`/`MediaType`/`inferMediaType`（Task 1）→ cloudbase API（Task 2）→ `countUsage`/`usedByExhibits`（Task 3）→ `MatchPlanRow`/`buildMatchPlan`/`stripExt`（Task 5）→ 组件（Task 4/6/7/8）签名前后一致；`updateExhibit` 需 `_id`（回填时展品对象来自 `fetchExhibits` 带 `_id`，满足）；写入字段名 `image`/`videoUrl`/`audioUrl` 与 `Exhibit` 字段一致。
- **已知实现风险（供子代理留意，非阻塞）**：Element Plus 图标的双 `<script>` 注册方式；若构建报错改为 `<script setup>` 顶层 import。`db.collection().where().orderBy()` 的链式在 `fetchMedia` 里按类型分支重建 query，避免类型累加问题。
