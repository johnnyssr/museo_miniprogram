# 后台重设计 + 全端海洋青蓝配色统一 · 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `admin/` 网页后台升级为带侧栏骨架、数据概览与批量运维功能的专业后台，并将后台与 `miniprogram/` 统一到海洋青蓝配色。

**Architecture:** 后台为 Vue 3 + Element Plus + Vite SPA，通过覆盖 Element Plus 主题 CSS 变量落地新配色；新增 `AppLayout` 三段式骨架、`DashboardView` 概览、列表页多选批量操作（删除 / 二维码 ZIP+打印 / CSV 导入向导 / 批量设字段）。小程序端仅替换硬编码色值为青蓝色板，不改交互。写操作沿用 CloudBase SDK 直连数据库 + `auth != null` 安全规则。

**Tech Stack:** Vue 3, TypeScript, Element Plus, Vue Router, Vite, `@cloudbase/js-sdk`, `qrcode`；新增前端库 `jszip`、`file-saver`、`papaparse`。小程序端 WXSS。

**测试说明:** 本仓库无前端测试框架，验证以 `npm run build`（在 `admin/` 下 TS 编译 + 打包必须通过）、`grep` 断言旧色值清除、以及手动验收清单为准。每个任务末尾 commit。

**分支:** 已在 `design/admin-redesign-teal-theme` 分支。

**关联 spec:** `docs/superpowers/specs/2026-08-30-admin-redesign-and-theme-unification-design.md`

---

## 文件结构总览

**后台新增:**
- `admin/src/styles/theme.css` — 海洋青蓝色板 + Element Plus 变量覆盖（唯一配色来源）
- `admin/src/layouts/AppLayout.vue` — 侧栏 + 顶栏 + 面包屑骨架
- `admin/src/views/DashboardView.vue` — 数据概览页
- `admin/src/views/ImportExhibitsView.vue` — 批量导入向导页
- `admin/src/utils/batch.ts` — 分批并发执行 + 结果汇总工具
- `admin/src/utils/qrExport.ts` — 批量二维码 ZIP 打包 / 打印数据准备
- `admin/src/utils/csv.ts` — CSV 模板生成 + 解析 + 校验

**后台改动:**
- `admin/src/main.ts` — 引入 `theme.css`
- `admin/src/App.vue` — 套用 `AppLayout`
- `admin/src/router/index.ts` — 新增 `/dashboard`、`/import` 路由，默认跳 dashboard
- `admin/src/views/ExhibitListView.vue` — 筛选 / 分页 / 多选 / 批量工具条 / 二维码导出
- `admin/src/cloudbase.ts` — 新增 `deleteExhibitsBatch`、`createExhibitsBatch`、`updateExhibitField` 封装
- `admin/package.json` — 新增依赖

**小程序改动（仅配色）:**
- `miniprogram/theme.wxss`（新增，色值集中说明 + 全局背景）
- `miniprogram/app.wxss`、`pages/index/index.wxss`、`pages/list/list.wxss`、`pages/exhibit/exhibit.wxss`
- `miniprogram/app.json`（导航栏配色）

---

## Phase 1 · 海洋青蓝主题落地（后台）

### Task 1: 建立后台主题色板文件

**Files:**
- Create: `admin/src/styles/theme.css`
- Modify: `admin/src/main.ts`

- [ ] **Step 1: 创建 `admin/src/styles/theme.css`**

```css
/* 海洋青蓝主题 · 唯一配色来源 */
:root {
  /* 品牌色板 */
  --ocean-primary: #1f6f78;
  --ocean-primary-dark: #155159;
  --ocean-primary-light: #2a8a95;
  --ocean-primary-bg: #e6f2f2;
  --ocean-accent: #e2a13b;
  --ocean-text-strong: #183b40;
  --ocean-text-body: #3d5257;
  --ocean-text-muted: #7a9196;
  --ocean-text-hint: #a9bcc0;
  --ocean-bg-page: #f2f7f7;
  --ocean-surface: #ffffff;
  --ocean-border: #cfe1e2;
  --ocean-placeholder: #e0efee;
  --ocean-success: #3fa66a;
  --ocean-danger: #d9534f;
  --ocean-shadow: rgba(24, 59, 64, 0.08);

  /* 覆盖 Element Plus 主色 */
  --el-color-primary: #1f6f78;
  --el-color-primary-light-3: #4a8f97;
  --el-color-primary-light-5: #77abb1;
  --el-color-primary-light-7: #a5c7cb;
  --el-color-primary-light-8: #bcd6d9;
  --el-color-primary-light-9: #e6f2f2;
  --el-color-primary-dark-2: #155159;
  --el-color-success: #3fa66a;
  --el-color-warning: #e2a13b;
  --el-color-danger: #d9534f;
}

body {
  background: var(--ocean-bg-page);
  color: var(--ocean-text-body);
}
```

- [ ] **Step 2: 在 `admin/src/main.ts` 引入（须在 Element Plus CSS 之后）**

在现有 `import 'element-plus/dist/index.css'` 之后新增一行：

```ts
import './styles/theme.css'
```

- [ ] **Step 3: 构建验证**

Run: `cd admin && npm run build`
Expected: 构建成功，无 TS / 打包错误。

- [ ] **Step 4: Commit**

```bash
git add admin/src/styles/theme.css admin/src/main.ts
git commit -m "feat(admin): 引入海洋青蓝主题色板并覆盖 Element Plus 主色"
```

---

### Task 2: 清理 App.vue 内联棕色，改用主题变量

**Files:**
- Modify: `admin/src/App.vue`

- [ ] **Step 1: 替换 `App.vue` `<style>` 中的棕色 hex**

将 header 相关样式改为使用变量。把 `background:#8a6d3b` 改为 `background: var(--ocean-primary)`；标题深棕 `#3a2f22`→`var(--ocean-text-strong)`；muted `#8a7d6a`→`var(--ocean-text-muted)`。示例（按实际选择器调整）：

```css
.app-header {
  display: flex;
  align-items: center;
  background: var(--ocean-primary);
  color: #fff;
}
.app-title { font-size: 18px; font-weight: 600; }
```

- [ ] **Step 2: grep 确认无残留棕色**

Run: `grep -nE "#8a6d3b|#3a2f22|#8a7d6a|#b0a692|#d8c9ad|#c9bda6|#eee7d9" admin/src/App.vue`
Expected: 无输出。

- [ ] **Step 3: 构建验证**

Run: `cd admin && npm run build`
Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add admin/src/App.vue
git commit -m "refactor(admin): App.vue 改用主题变量替代内联棕色"
```

---

## Phase 2 · 后台外壳与数据概览

### Task 3: 新增 AppLayout 骨架（侧栏 + 顶栏 + 面包屑）

**Files:**
- Create: `admin/src/layouts/AppLayout.vue`
- Modify: `admin/src/App.vue`

- [ ] **Step 1: 创建 `admin/src/layouts/AppLayout.vue`**

```vue
<template>
  <el-container class="admin-shell">
    <el-aside :width="collapsed ? '64px' : '208px'" class="shell-aside">
      <div class="brand">🌊 <span v-show="!collapsed">运维后台</span></div>
      <el-menu :collapse="collapsed" :default-active="activeMenu" router
               background-color="transparent" text-color="#dbeeef" active-text-color="#fff">
        <el-menu-item index="/dashboard"><el-icon><DataLine /></el-icon><span>数据概览</span></el-menu-item>
        <el-menu-item index="/exhibits"><el-icon><Files /></el-icon><span>展品管理</span></el-menu-item>
        <el-menu-item index="/import"><el-icon><Upload /></el-icon><span>批量导入</span></el-menu-item>
      </el-menu>
      <div class="collapse-toggle" @click="collapsed = !collapsed">{{ collapsed ? '»' : '«' }}</div>
    </el-aside>
    <el-container>
      <el-header class="shell-header">
        <div class="header-title">北部湾海洋生态守护站 · 运维后台</div>
        <el-dropdown @command="onCommand">
          <span class="header-user">👤 管理员 ▾</span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <el-main class="shell-main">
        <el-breadcrumb class="shell-crumb" separator="/">
          <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
          <el-breadcrumb-item>{{ crumb }}</el-breadcrumb-item>
        </el-breadcrumb>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DataLine, Files, Upload } from '@element-plus/icons-vue'
import { logout } from '../cloudbase'

const route = useRoute()
const router = useRouter()
const collapsed = ref(false)
const activeMenu = computed(() => '/' + (route.path.split('/')[1] || 'dashboard'))
const CRUMBS: Record<string, string> = {
  dashboard: '数据概览', exhibits: '展品管理', import: '批量导入',
}
const crumb = computed(() => CRUMBS[route.path.split('/')[1]] || '展品管理')

async function onCommand(cmd: string) {
  if (cmd === 'logout') { await logout(); router.push('/login') }
}
</script>

<style scoped>
.admin-shell { height: 100vh; }
.shell-aside {
  background: var(--ocean-primary-dark);
  color: #dbeeef; display: flex; flex-direction: column; position: relative;
}
.brand { height: 56px; display: flex; align-items: center; gap: 8px; padding: 0 18px; font-weight: 600; color: #fff; }
.shell-aside .el-menu { border-right: none; }
.collapse-toggle { margin-top: auto; padding: 12px 18px; cursor: pointer; color: #a9c9cc; }
.shell-header {
  display: flex; align-items: center; justify-content: space-between;
  background: var(--ocean-primary); color: #fff;
}
.header-title { font-size: 16px; font-weight: 600; }
.header-user { color: #fff; cursor: pointer; }
.shell-main { background: var(--ocean-bg-page); }
.shell-crumb { margin-bottom: 16px; }
</style>
```

- [ ] **Step 2: 确认 `logout` 已在 `cloudbase.ts` 导出**

Run: `grep -n "export .*logout\|signOut" admin/src/cloudbase.ts`
Expected: 有导出的登出函数。若名称不同（如 `signOut`），在 `AppLayout.vue` 中改用实际导出名。若不存在，在 `cloudbase.ts` 新增：

```ts
export async function logout(): Promise<void> {
  const auth = app.auth()
  await auth.signOut()
}
```

- [ ] **Step 3: 改造 `admin/src/App.vue` 套用骨架**

`App.vue` 根据路由是否为 `/login` 决定是否套 `AppLayout`：

```vue
<template>
  <router-view v-if="isLogin" />
  <AppLayout v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from './layouts/AppLayout.vue'
const route = useRoute()
const isLogin = computed(() => route.path === '/login')
</script>
```

> 注意：`AppLayout` 内部已含 `<router-view>`，登录页走顶层 `<router-view>`，避免嵌套。

- [ ] **Step 4: 构建验证**

Run: `cd admin && npm run build`
Expected: 成功。

- [ ] **Step 5: Commit**

```bash
git add admin/src/layouts/AppLayout.vue admin/src/App.vue admin/src/cloudbase.ts
git commit -m "feat(admin): 新增侧栏+顶栏三段式后台骨架 AppLayout"
```

---

### Task 4: 数据概览页 DashboardView

**Files:**
- Create: `admin/src/views/DashboardView.vue`
- Modify: `admin/src/router/index.ts`

- [ ] **Step 1: 创建 `admin/src/views/DashboardView.vue`**

```vue
<template>
  <div v-loading="loading">
    <div class="stat-row">
      <el-card v-for="s in stats" :key="s.label" class="stat-card" shadow="hover">
        <div class="stat-value">{{ s.value }}</div>
        <div class="stat-label">{{ s.label }}</div>
      </el-card>
    </div>
    <el-card class="recent" shadow="never">
      <template #header>
        <div class="recent-head">
          <span>最近展品</span>
          <div>
            <el-button type="primary" @click="$router.push('/exhibits/new')">新增展品</el-button>
            <el-button @click="$router.push('/import')">批量导入</el-button>
          </div>
        </div>
      </template>
      <el-table :data="recent" size="small">
        <el-table-column prop="exhibitId" label="编号" width="140" />
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="dynasty" label="朝代" width="120" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchExhibits } from '../cloudbase'
import type { Exhibit } from '../types/exhibit'

const loading = ref(false)
const items = ref<Exhibit[]>([])

onMounted(async () => {
  loading.value = true
  try { items.value = await fetchExhibits() } finally { loading.value = false }
})

const stats = computed(() => {
  const list = items.value
  const withMedia = (k: keyof Exhibit) => list.filter(e => !!e[k]).length
  const total = list.length
  const complete = list.filter(e => e.image && e.audioUrl && e.text).length
  return [
    { label: '展品总数', value: total },
    { label: '含图片', value: withMedia('image') },
    { label: '含音频', value: withMedia('audioUrl') },
    { label: '含视频', value: withMedia('videoUrl') },
    { label: '媒体完整度', value: total ? Math.round((complete / total) * 100) + '%' : '—' },
  ]
})

const recent = computed(() => items.value.slice(0, 8))
</script>

<style scoped>
.stat-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card { text-align: center; }
.stat-value { font-size: 28px; font-weight: 700; color: var(--ocean-primary); }
.stat-label { margin-top: 6px; color: var(--ocean-text-muted); font-size: 13px; }
.recent-head { display: flex; align-items: center; justify-content: space-between; }
</style>
```

> 依赖假设：`fetchExhibits()` 返回 `Exhibit[]`。若其返回结构不同（如 `{ list }`），在此适配为数组。校验方式见 Step 2。

- [ ] **Step 2: 核对 `fetchExhibits` 返回类型**

Run: `grep -n "export .*fetchExhibits" admin/src/cloudbase.ts`
Expected: 确认返回 `Promise<Exhibit[]>`；若为对象则在 DashboardView 调整为 `.list`。

- [ ] **Step 3: 注册路由并设为默认页 `admin/src/router/index.ts`**

在 routes 数组中，将根路径重定向改为 `/dashboard`，并新增：

```ts
{ path: '/dashboard', component: () => import('../views/DashboardView.vue'), meta: { requiresAuth: true } },
```

将现有 `{ path: '/', redirect: '/exhibits' }` 改为 `redirect: '/dashboard'`。登录成功后的跳转目标若硬编码为 `/exhibits`，改为 `/dashboard`（检查 `LoginView.vue`）。

- [ ] **Step 4: 构建验证**

Run: `cd admin && npm run build`
Expected: 成功。

- [ ] **Step 5: Commit**

```bash
git add admin/src/views/DashboardView.vue admin/src/router/index.ts
git commit -m "feat(admin): 新增数据概览页并设为登录后默认页"
```

---

## Phase 3 · 展品列表增强（筛选 / 分页 / 多选）

### Task 5: 列表页筛选栏与分页

**Files:**
- Modify: `admin/src/views/ExhibitListView.vue`

- [ ] **Step 1: 在 `ExhibitListView.vue` 顶部工具区加入筛选栏**

在现有 `新增展品 / 刷新` 工具栏下方新增筛选行（保留原有列表加载逻辑，`allItems` 为完整数据源）：

```vue
<div class="filter-bar">
  <el-input v-model="keyword" placeholder="搜索名称/编号" clearable style="width: 220px" />
  <el-select v-model="dynastyFilter" placeholder="按朝代筛选" clearable style="width: 160px">
    <el-option v-for="d in dynastyOptions" :key="d" :label="d" :value="d" />
  </el-select>
  <el-select v-model="sortBy" style="width: 140px">
    <el-option label="按编号" value="exhibitId" />
    <el-option label="按名称" value="name" />
  </el-select>
</div>
```

- [ ] **Step 2: 加入计算属性与分页状态（`<script setup>`）**

```ts
import { computed, ref } from 'vue'
const keyword = ref('')
const dynastyFilter = ref('')
const sortBy = ref<'exhibitId' | 'name'>('exhibitId')
const page = ref(1)
const pageSize = ref(20)

// allItems 为已加载的完整列表（沿用现有加载逻辑赋值）
const dynastyOptions = computed(() =>
  Array.from(new Set(allItems.value.map(e => e.dynasty).filter(Boolean))) as string[])

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return allItems.value
    .filter(e => !kw || e.name.toLowerCase().includes(kw) || e.exhibitId.toLowerCase().includes(kw))
    .filter(e => !dynastyFilter.value || e.dynasty === dynastyFilter.value)
    .slice()
    .sort((a, b) => String(a[sortBy.value]).localeCompare(String(b[sortBy.value]), 'zh'))
})

const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})
```

将 `el-table` 的 `:data` 由原数据源改为 `paged`。

- [ ] **Step 3: 表格下方加入分页器**

```vue
<el-pagination
  class="pager"
  layout="total, prev, pager, next, sizes"
  :total="filtered.length"
  :page-size="pageSize"
  :current-page="page"
  :page-sizes="[10, 20, 50, 100]"
  @current-change="page = $event"
  @size-change="pageSize = $event; page = 1"
/>
```

- [ ] **Step 4: 构建验证**

Run: `cd admin && npm run build`
Expected: 成功。

- [ ] **Step 5: Commit**

```bash
git add admin/src/views/ExhibitListView.vue
git commit -m "feat(admin): 展品列表加入搜索/朝代筛选/排序/分页"
```

---

### Task 6: 多选列 + 批量工具条骨架

**Files:**
- Modify: `admin/src/views/ExhibitListView.vue`

- [ ] **Step 1: 表格加入多选列**

在 `el-table` 上绑定选择事件，并加多选列作为第一列：

```vue
<el-table :data="paged" @selection-change="onSelectionChange" ...>
  <el-table-column type="selection" width="48" />
  <!-- 其余列不变 -->
</el-table>
```

- [ ] **Step 2: 选中态与工具条（`<script setup>` + 模板）**

```ts
const selected = ref<Exhibit[]>([])
function onSelectionChange(rows: Exhibit[]) { selected.value = rows }
```

在筛选栏与表格之间插入工具条（有选中项时显示）：

```vue
<div v-if="selected.length" class="batch-bar">
  <span>已选 {{ selected.length }} 项</span>
  <el-button type="danger" plain @click="onBatchDelete">批量删除</el-button>
  <el-button type="primary" plain @click="onBatchQr">批量导出二维码</el-button>
  <el-button plain @click="onBatchDynasty">批量设置朝代</el-button>
</div>
```

先为三个 handler 建空实现（后续任务填充），保证可编译：

```ts
function onBatchDelete() {}
function onBatchQr() {}
function onBatchDynasty() {}
```

- [ ] **Step 3: 样式**

```css
.batch-bar { display: flex; align-items: center; gap: 12px; padding: 10px 14px;
  background: var(--ocean-primary-bg); border-radius: 6px; margin-bottom: 12px; }
```

- [ ] **Step 4: 构建验证**

Run: `cd admin && npm run build`
Expected: 成功。

- [ ] **Step 5: Commit**

```bash
git add admin/src/views/ExhibitListView.vue
git commit -m "feat(admin): 展品列表加入多选与批量操作工具条骨架"
```

---

## Phase 4 · 批量操作实现

### Task 7: 分批并发执行工具 batch.ts

**Files:**
- Create: `admin/src/utils/batch.ts`

- [ ] **Step 1: 创建 `admin/src/utils/batch.ts`**

```ts
export interface BatchResult<T> {
  ok: T[]
  failed: { item: T; error: string }[]
}

/**
 * 分批并发执行任务，收集成功与失败，绝不静默吞错。
 * @param items 待处理项
 * @param worker 单项异步处理
 * @param concurrency 并发上限（默认 5）
 * @param onProgress 进度回调 (done, total)
 */
export async function runBatch<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency = 5,
  onProgress?: (done: number, total: number) => void,
): Promise<BatchResult<T>> {
  const ok: T[] = []
  const failed: { item: T; error: string }[] = []
  let done = 0
  const total = items.length
  const queue = [...items]

  async function runner() {
    while (queue.length) {
      const item = queue.shift() as T
      try {
        await worker(item)
        ok.push(item)
      } catch (e) {
        failed.push({ item, error: e instanceof Error ? e.message : String(e) })
      } finally {
        done += 1
        onProgress?.(done, total)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, total) }, runner))
  return { ok, failed }
}
```

- [ ] **Step 2: 构建验证**

Run: `cd admin && npm run build`
Expected: 成功。

- [ ] **Step 3: Commit**

```bash
git add admin/src/utils/batch.ts
git commit -m "feat(admin): 新增分批并发执行工具 runBatch"
```

---

### Task 8: 批量删除

**Files:**
- Modify: `admin/src/cloudbase.ts`
- Modify: `admin/src/views/ExhibitListView.vue`

- [ ] **Step 1: 在 `cloudbase.ts` 新增批量删除封装**

复用现有单条 `deleteExhibit`（按其实际签名调用；下例假设 `deleteExhibit(exhibit)`）：

```ts
import { runBatch, type BatchResult } from './utils/batch'

export async function deleteExhibitsBatch(
  items: Exhibit[],
  onProgress?: (d: number, t: number) => void,
): Promise<BatchResult<Exhibit>> {
  return runBatch(items, (e) => deleteExhibit(e), 5, onProgress)
}
```

> 若 `deleteExhibit` 签名是 `deleteExhibit(id: string)` 等，改为 `(e) => deleteExhibit(e._id!)`。用 `grep -n "export .*deleteExhibit" admin/src/cloudbase.ts` 确认。

- [ ] **Step 2: 在 `ExhibitListView.vue` 实现 `onBatchDelete`**

```ts
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteExhibitsBatch } from '../cloudbase'

async function onBatchDelete() {
  await ElMessageBox.confirm(
    `将删除选中的 ${selected.value.length} 条展品，删除后不可恢复。是否继续？`,
    '批量删除确认', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
  )
  const res = await deleteExhibitsBatch(selected.value)
  if (res.failed.length) {
    ElMessage.error(`删除完成：成功 ${res.ok.length}，失败 ${res.failed.length}。首个失败原因：${res.failed[0].error}`)
  } else {
    ElMessage.success(`已删除 ${res.ok.length} 条`)
  }
  await reload() // 调用现有列表重新加载函数；若名称不同请替换
}
```

> `reload()` 指列表现有的加载函数。用 `grep -n "async function\|const .*= async" admin/src/views/ExhibitListView.vue` 找到实际的加载函数名并替换。

- [ ] **Step 3: 构建验证**

Run: `cd admin && npm run build`
Expected: 成功。

- [ ] **Step 4: 手动验收**

在开发环境登录后台，勾选 2 条展品 → 批量删除 → 确认弹窗 → 列表刷新、条目消失、toast 显示成功数。

- [ ] **Step 5: Commit**

```bash
git add admin/src/cloudbase.ts admin/src/views/ExhibitListView.vue
git commit -m "feat(admin): 批量删除展品（含二次确认与结果汇总）"
```

---

### Task 9: 批量二维码导出（ZIP + 打印排版）

**Files:**
- Modify: `admin/package.json`（新增 `jszip`、`file-saver`）
- Create: `admin/src/utils/qrExport.ts`
- Modify: `admin/src/views/ExhibitListView.vue`

- [ ] **Step 1: 安装依赖**

Run: `cd admin && npm install jszip file-saver && npm install -D @types/file-saver`
Expected: 依赖写入 `package.json`。

- [ ] **Step 2: 创建 `admin/src/utils/qrExport.ts`**

```ts
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { fetchExhibitQRCode } from '../cloudbase'
import { runBatch } from './batch'
import type { Exhibit } from '../types/exhibit'

export interface QrItem { exhibit: Exhibit; dataUrl: string }

/** 逐个获取展品二维码 base64（复用云函数），返回成功项与失败项 */
export async function collectQrCodes(
  items: Exhibit[],
  onProgress?: (d: number, t: number) => void,
): Promise<{ ok: QrItem[]; failed: { item: Exhibit; error: string }[] }> {
  const ok: QrItem[] = []
  const res = await runBatch(items, async (e) => {
    const { base64, contentType } = await fetchExhibitQRCode(e.exhibitId)
    ok.push({ exhibit: e, dataUrl: `data:${contentType || 'image/png'};base64,${base64}` })
  }, 3, onProgress)
  return { ok, failed: res.failed }
}

/** 打包为 ZIP 下载，文件名 {exhibitId}.png */
export async function exportQrZip(items: QrItem[]): Promise<void> {
  const zip = new JSZip()
  for (const it of items) {
    const b64 = it.dataUrl.split(',')[1]
    zip.file(`${it.exhibit.exhibitId}.png`, b64, { base64: true })
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, `exhibit-qrcodes-${items.length}.zip`)
}

/** 生成可打印 HTML 并触发打印（新窗口） */
export function printQrSheet(items: QrItem[]): void {
  const cells = items.map(it => `
    <div class="cell">
      <img src="${it.dataUrl}" />
      <div class="id">${it.exhibit.exhibitId}</div>
      <div class="name">${it.exhibit.name}</div>
    </div>`).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>二维码标签</title>
    <style>
      body { font-family: sans-serif; }
      .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 16px; }
      .cell { border: 1px solid #cfe1e2; border-radius: 8px; padding: 10px; text-align: center; }
      .cell img { width: 120px; height: 120px; }
      .id { color: #1f6f78; font-weight: 600; margin-top: 6px; }
      .name { color: #183b40; font-size: 13px; }
      @media print { .cell { break-inside: avoid; } }
    </style></head>
    <body><div class="grid">${cells}</div>
    <script>window.onload = () => window.print()</script></body></html>`
  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}
```

> 依赖假设：`fetchExhibitQRCode(exhibitId)` 返回 `{ base64, contentType }`。用 `grep -n "export .*fetchExhibitQRCode" admin/src/cloudbase.ts` 核对返回结构并适配。

- [ ] **Step 3: 在 `ExhibitListView.vue` 实现 `onBatchQr`**

```ts
import { collectQrCodes, exportQrZip, printQrSheet } from '../utils/qrExport'

async function onBatchQr() {
  const action = await ElMessageBox.confirm(
    `将为选中的 ${selected.value.length} 个展品生成二维码。选择输出方式：`,
    '批量导出二维码',
    { distinguishCancelAndClose: true, confirmButtonText: '打包下载ZIP', cancelButtonText: '打印标签页' },
  ).then(() => 'zip').catch((a) => a === 'cancel' ? 'print' : 'abort')
  if (action === 'abort') return

  const loading = ElMessage({ message: '正在生成二维码…', duration: 0 })
  const { ok, failed } = await collectQrCodes(selected.value)
  loading.close()
  if (!ok.length) { ElMessage.error('二维码生成全部失败'); return }
  if (action === 'zip') await exportQrZip(ok)
  else printQrSheet(ok)
  if (failed.length) ElMessage.warning(`${failed.length} 个生成失败，已跳过`)
}
```

- [ ] **Step 4: 构建验证**

Run: `cd admin && npm run build`
Expected: 成功。

- [ ] **Step 5: 手动验收**

勾选 3 条 → 批量导出二维码 → 分别测试 ZIP 下载（解压得到 3 个 png）与打印标签页（新窗口出现 3 个二维码网格并弹出打印）。

- [ ] **Step 6: Commit**

```bash
git add admin/package.json admin/package-lock.json admin/src/utils/qrExport.ts admin/src/views/ExhibitListView.vue
git commit -m "feat(admin): 批量导出二维码（ZIP 打包与打印标签排版）"
```

---

### Task 10: CSV 解析/校验工具 csv.ts

**Files:**
- Modify: `admin/package.json`（新增 `papaparse`）
- Create: `admin/src/utils/csv.ts`

- [ ] **Step 1: 安装依赖**

Run: `cd admin && npm install papaparse && npm install -D @types/papaparse`
Expected: 依赖写入。

- [ ] **Step 2: 创建 `admin/src/utils/csv.ts`**

```ts
import Papa from 'papaparse'
import type { Exhibit } from '../types/exhibit'

export const CSV_HEADERS = ['exhibitId', 'name', 'dynasty', 'text', 'image', 'audioUrl', 'videoUrl'] as const

export interface ParsedRow {
  data: Partial<Exhibit>
  rowIndex: number
  errors: string[]   // 校验错误，空数组=合法
}

/** 生成模板 CSV 文本（含表头 + 一行示例） */
export function buildTemplateCsv(): string {
  const example = ['exhibit-001', '示例展品', '现代', '这里填文字介绍', 'https://…/pic.png', 'cloud://…/audio.mp3', '']
  return Papa.unparse([CSV_HEADERS as unknown as string[], example])
}

/**
 * 解析并校验 CSV 文本。
 * @param text CSV 内容
 * @param existingIds 库中已存在的 exhibitId 集合（用于查重）
 */
export function parseAndValidate(text: string, existingIds: Set<string>): ParsedRow[] {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), { header: true, skipEmptyLines: true })
  const seen = new Set<string>()
  return parsed.data.map((raw, i) => {
    const data: Partial<Exhibit> = {
      exhibitId: (raw.exhibitId || '').trim(),
      name: (raw.name || '').trim(),
      dynasty: (raw.dynasty || '').trim(),
      text: (raw.text || '').trim(),
      image: (raw.image || '').trim(),
      audioUrl: (raw.audioUrl || '').trim(),
      videoUrl: (raw.videoUrl || '').trim(),
    }
    const errors: string[] = []
    if (!data.exhibitId) errors.push('缺少编号 exhibitId')
    if (!data.name) errors.push('缺少名称 name')
    if (data.exhibitId && existingIds.has(data.exhibitId)) errors.push('编号已存在于库中')
    if (data.exhibitId && seen.has(data.exhibitId)) errors.push('文件内编号重复')
    if (data.exhibitId) seen.add(data.exhibitId)
    return { data, rowIndex: i + 2, errors } // +2: 表头占第1行，数据从第2行起
  })
}
```

- [ ] **Step 3: 构建验证**

Run: `cd admin && npm run build`
Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add admin/package.json admin/package-lock.json admin/src/utils/csv.ts
git commit -m "feat(admin): 新增 CSV 模板生成与解析校验工具"
```

---

### Task 11: 批量导入向导页 ImportExhibitsView

**Files:**
- Modify: `admin/src/cloudbase.ts`（新增 `createExhibitsBatch`）
- Create: `admin/src/views/ImportExhibitsView.vue`
- Modify: `admin/src/router/index.ts`

- [ ] **Step 1: 在 `cloudbase.ts` 新增批量创建封装**

复用现有单条 `createExhibit`（其内部已做必填/查重/字段白名单）：

```ts
export async function createExhibitsBatch(
  rows: Partial<Exhibit>[],
  onProgress?: (d: number, t: number) => void,
): Promise<BatchResult<Partial<Exhibit>>> {
  return runBatch(rows, (r) => createExhibit(r as Exhibit).then(() => undefined), 5, onProgress)
}
```

> 用 `grep -n "export .*createExhibit\b" admin/src/cloudbase.ts` 核对签名并适配。

- [ ] **Step 2: 创建 `admin/src/views/ImportExhibitsView.vue`**

```vue
<template>
  <el-card shadow="never">
    <el-steps :active="step" finish-status="success" simple>
      <el-step title="下载模板" />
      <el-step title="上传解析" />
      <el-step title="预览校验" />
      <el-step title="确认导入" />
    </el-steps>

    <div class="step-body">
      <el-alert type="info" :closable="false"
        title="媒体文件说明：图片/音频/视频列只能填写已有的 https:// 或 cloud:// 链接，导入不会上传本地文件。" />

      <div v-if="step <= 1" class="actions">
        <el-button type="primary" @click="downloadTemplate">下载 CSV 模板</el-button>
        <el-upload :auto-upload="false" :show-file-list="false" accept=".csv" :on-change="onFile">
          <el-button>上传 CSV</el-button>
        </el-upload>
      </div>

      <div v-if="step >= 2">
        <el-table :data="rows" size="small" max-height="420">
          <el-table-column prop="rowIndex" label="行" width="60" />
          <el-table-column prop="data.exhibitId" label="编号" width="140" />
          <el-table-column prop="data.name" label="名称" />
          <el-table-column prop="data.dynasty" label="朝代" width="100" />
          <el-table-column label="校验" width="240">
            <template #default="{ row }">
              <el-tag v-if="!row.errors.length" type="success">合法</el-tag>
              <el-tag v-else type="danger">{{ row.errors.join('；') }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <div class="summary">
          合法 {{ validRows.length }} 行，错误 {{ rows.length - validRows.length }} 行（错误行将被跳过）
        </div>
        <el-button type="primary" :disabled="!validRows.length" :loading="importing" @click="doImport">
          导入 {{ validRows.length }} 条
        </el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { saveAs } from 'file-saver'
import { buildTemplateCsv, parseAndValidate, type ParsedRow } from '../utils/csv'
import { fetchExhibits, createExhibitsBatch } from '../cloudbase'

const step = ref(1)
const rows = ref<ParsedRow[]>([])
const importing = ref(false)
const validRows = computed(() => rows.value.filter(r => !r.errors.length))

function downloadTemplate() {
  saveAs(new Blob(['﻿' + buildTemplateCsv()], { type: 'text/csv;charset=utf-8' }), 'exhibit-template.csv')
}

async function onFile(file: { raw: File }) {
  const text = await file.raw.text()
  const existing = await fetchExhibits()
  const ids = new Set(existing.map(e => e.exhibitId))
  rows.value = parseAndValidate(text, ids)
  step.value = 2
}

async function doImport() {
  importing.value = true
  try {
    const res = await createExhibitsBatch(validRows.value.map(r => r.data))
    step.value = 3
    if (res.failed.length) {
      ElMessage.error(`导入完成：成功 ${res.ok.length}，失败 ${res.failed.length}。首个失败：${res.failed[0].error}`)
    } else {
      ElMessage.success(`成功导入 ${res.ok.length} 条`)
    }
  } finally { importing.value = false }
}
</script>

<style scoped>
.step-body { margin-top: 20px; display: flex; flex-direction: column; gap: 16px; }
.actions { display: flex; gap: 12px; }
.summary { margin: 12px 0; color: var(--ocean-text-muted); }
</style>
```

- [ ] **Step 3: 注册路由 `admin/src/router/index.ts`**

```ts
{ path: '/import', component: () => import('../views/ImportExhibitsView.vue'), meta: { requiresAuth: true } },
```

- [ ] **Step 4: 构建验证**

Run: `cd admin && npm run build`
Expected: 成功。

- [ ] **Step 5: 手动验收**

进入批量导入 → 下载模板（得到含表头的 CSV）→ 填 2 行有效 + 1 行缺 name → 上传 → 预览中缺 name 行标红、有效行绿 → 导入 → 成功 2 条、跳过 1 条；库中出现新展品。

- [ ] **Step 6: Commit**

```bash
git add admin/src/cloudbase.ts admin/src/views/ImportExhibitsView.vue admin/src/router/index.ts
git commit -m "feat(admin): 批量导入向导（模板/解析/校验/汇总）"
```

---

### Task 12: 批量设置朝代

**Files:**
- Modify: `admin/src/cloudbase.ts`（新增 `updateExhibitField`）
- Modify: `admin/src/views/ExhibitListView.vue`

- [ ] **Step 1: 在 `cloudbase.ts` 新增字段更新封装**

复用现有 `updateExhibit`（字段白名单保护）：

```ts
export async function updateExhibitField(
  items: Exhibit[], field: 'dynasty', value: string,
  onProgress?: (d: number, t: number) => void,
): Promise<BatchResult<Exhibit>> {
  return runBatch(items, (e) => updateExhibit({ ...e, [field]: value }).then(() => undefined), 5, onProgress)
}
```

> 用 `grep -n "export .*updateExhibit\b" admin/src/cloudbase.ts` 核对 `updateExhibit` 参数（需 `_id`），适配调用。

- [ ] **Step 2: 在 `ExhibitListView.vue` 实现 `onBatchDynasty`**

```ts
import { updateExhibitField } from '../cloudbase'

async function onBatchDynasty() {
  const { value } = await ElMessageBox.prompt(
    `为选中的 ${selected.value.length} 条展品统一设置朝代：`, '批量设置朝代',
    { confirmButtonText: '确定', cancelButtonText: '取消' },
  )
  const res = await updateExhibitField(selected.value, 'dynasty', (value || '').trim())
  ElMessage[res.failed.length ? 'warning' : 'success'](
    `更新完成：成功 ${res.ok.length}${res.failed.length ? '，失败 ' + res.failed.length : ''}`)
  await reload()
}
```

- [ ] **Step 3: 构建验证**

Run: `cd admin && npm run build`
Expected: 成功。

- [ ] **Step 4: Commit**

```bash
git add admin/src/cloudbase.ts admin/src/views/ExhibitListView.vue
git commit -m "feat(admin): 批量设置展品朝代字段"
```

---

## Phase 5 · 小程序配色统一

### Task 13: 建立小程序主题文件并接入全局

**Files:**
- Create: `miniprogram/theme.wxss`
- Modify: `miniprogram/app.wxss`

- [ ] **Step 1: 创建 `miniprogram/theme.wxss`**

（WXSS 老基础库对 `var()` 支持不稳，这里用集中注释 + 全局基础样式；各页仍替换真实 hex。此文件承载全局背景与颜色约定说明。）

```css
/* 海洋青蓝主题 · 色值约定（各页 .wxss 按此表替换）
   primary        #1f6f78   主色：按钮/链接/标签/箭头
   text-strong    #183b40   主标题
   text-body      #3d5257   正文
   text-muted     #7a9196   次要文字/空状态
   text-hint      #a9bcc0   提示/箭头
   bg-page        #f2f7f7   页面背景
   border         #cfe1e2   边框
   placeholder    #e0efee   占位底
   shadow         rgba(24,59,64,0.08) 卡片阴影
*/
page { background: #f2f7f7; color: #3d5257; }
```

- [ ] **Step 2: 在 `miniprogram/app.wxss` 顶部引入**

在文件最上方新增：

```css
@import "theme.wxss";
```

- [ ] **Step 3: Commit**

```bash
git add miniprogram/theme.wxss miniprogram/app.wxss
git commit -m "feat(mp): 新增小程序海洋青蓝主题文件并全局引入"
```

---

### Task 14: 替换 index 页配色

**Files:**
- Modify: `miniprogram/pages/index/index.wxss`

- [ ] **Step 1: 按映射表替换 `index.wxss` 全部色值**

- `page` 背景 `#f5f3ee` → `#f2f7f7`
- `.title` `#3a2f22` → `#183b40`
- `.subtitle` `#8a7d6a` → `#7a9196`
- `.scan-btn` 背景 `#8a6d3b` → `#1f6f78`（`color:#fff` 不变）
- `.hint` `#b0a692` → `#a9bcc0`
- `.browse-link` 文字 `#8a6d3b` → `#1f6f78`；边框 `#d8c9ad` → `#cfe1e2`

- [ ] **Step 2: grep 确认无残留旧色**

Run: `grep -nE "#8a6d3b|#3a2f22|#8a7d6a|#b0a692|#d8c9ad|#f5f3ee" miniprogram/pages/index/index.wxss`
Expected: 无输出。

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/index/index.wxss
git commit -m "feat(mp): index 页配色改为海洋青蓝"
```

---

### Task 15: 替换 list 页配色

**Files:**
- Modify: `miniprogram/pages/list/list.wxss`

- [ ] **Step 1: 按映射表替换 `list.wxss` 全部色值**

- `.page` `#f5f3ee` → `#f2f7f7`
- `.page-title` `#3a2f22` → `#183b40`
- `.empty` `#8a7d6a` → `#7a9196`
- `.card` `background:#fff` 不变；box-shadow `rgba(58,47,34,0.06)` → `rgba(24,59,64,0.08)`
- `.thumb` `#eee7d9` → `#e0efee`
- `.card-name` `#3a2f22` → `#183b40`
- `.card-dynasty` `#8a6d3b` → `#1f6f78`
- `.card-arrow` `#c9bda6` → `#a9bcc0`

- [ ] **Step 2: grep 确认无残留旧色**

Run: `grep -nE "#8a6d3b|#3a2f22|#8a7d6a|#c9bda6|#eee7d9|#f5f3ee|58, ?47, ?34" miniprogram/pages/list/list.wxss`
Expected: 无输出。

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/list/list.wxss
git commit -m "feat(mp): list 页配色改为海洋青蓝"
```

---

### Task 16: 替换 exhibit 页配色

**Files:**
- Modify: `miniprogram/pages/exhibit/exhibit.wxss`

- [ ] **Step 1: 按映射表替换 `exhibit.wxss` 全部色值**

- `.page` `#f5f3ee` → `#f2f7f7`
- `.empty` `#8a7d6a` → `#7a9196`
- `.header`/`.section`/`.block` `background:#fff` 不变
- `.name` `#3a2f22` → `#183b40`
- `.dynasty` `#8a6d3b` → `#1f6f78`
- `.section-title` `#3a2f22` → `#183b40`
- `.text` `#5a5145` → `#3d5257`
- `.block-head` `#3a2f22` → `#183b40`
- `.arrow` `#8a6d3b` → `#1f6f78`
- `.play-btn` 背景 `#8a6d3b` → `#1f6f78`（`color:#fff` 不变）

- [ ] **Step 2: grep 确认无残留旧色**

Run: `grep -nE "#8a6d3b|#3a2f22|#8a7d6a|#5a5145|#f5f3ee" miniprogram/pages/exhibit/exhibit.wxss`
Expected: 无输出。

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/exhibit/exhibit.wxss
git commit -m "feat(mp): exhibit 页配色改为海洋青蓝"
```

---

### Task 17: 导航栏配色

**Files:**
- Modify: `miniprogram/app.json`

- [ ] **Step 1: 修改全局 window 导航栏配色**

在 `miniprogram/app.json` 的 `window` 中：

- `navigationBarBackgroundColor`: `#ffffff` → `#1f6f78`
- `navigationBarTextStyle`: `black` → `white`

（`navigationBarTitleText` 保持不变。）

- [ ] **Step 2: 校验 JSON 合法**

Run: `cd /Users/I354885/WeChatProjects/miniprogram-1 && node -e "JSON.parse(require('fs').readFileSync('miniprogram/app.json','utf8')); console.log('ok')"`
Expected: 输出 `ok`。

- [ ] **Step 3: Commit**

```bash
git add miniprogram/app.json
git commit -m "feat(mp): 导航栏改为海洋青蓝底白字"
```

---

### Task 18: 全端配色回归检查

**Files:** 无（仅验证）

- [ ] **Step 1: 全局搜索小程序残留旧色**

Run: `grep -rnE "#8a6d3b|#3a2f22|#8a7d6a|#b0a692|#d8c9ad|#c9bda6|#eee7d9|#5a5145|#f5f3ee|58, ?47, ?34" miniprogram/`
Expected: 无输出（logs.wxss 本就无颜色）。

- [ ] **Step 2: 全局搜索后台残留旧色**

Run: `grep -rnE "#8a6d3b|#3a2f22|#8a7d6a" admin/src/`
Expected: 无输出（theme.css 中映射注释除外——如命中仅为注释可忽略）。

- [ ] **Step 3: 后台最终构建**

Run: `cd admin && npm run build`
Expected: 成功。

- [ ] **Step 4: 微信开发者工具目视验收**

打开小程序：首页/列表/详情三页背景为浅青、按钮/标签/链接为青蓝、导航栏青底白字、扫码与音视频播放交互正常。

- [ ] **Step 5: Commit（如有清理）**

```bash
git commit --allow-empty -m "chore: 全端海洋青蓝配色回归检查通过"
```

---

## 自检对照（Self-Review）

- **Spec §2 色板/映射** → Task 1（后台色板）、Task 13–17（小程序映射）✅
- **Spec §3.1 外壳** → Task 3 ✅
- **Spec §3.2 主题落地** → Task 1、Task 2 ✅
- **Spec §3.3 概览页** → Task 4 ✅
- **Spec §3.4 列表增强** → Task 5、Task 6 ✅
- **Spec §4.1 批量删除** → Task 8 ✅
- **Spec §4.2 二维码导出** → Task 9 ✅
- **Spec §4.3 批量导入** → Task 10、Task 11 ✅
- **Spec §4.4 批量设字段** → Task 12 ✅
- **Spec §5.2 小程序改动** → Task 13–17 ✅
- **Spec §6 错误处理** → Task 7（runBatch 汇总）贯穿 Task 8/9/11/12 ✅
- **Spec §7 测试策略** → 各任务的构建/ grep / 手动验收步骤 + Task 18 回归 ✅

**依赖签名假设**（实现时须用 grep 核对并适配，已在相应任务内标注）：`fetchExhibits`、`deleteExhibit`、`createExhibit`、`updateExhibit`、`fetchExhibitQRCode`、`logout`。

**未纳入（YAGNI，符合 spec 非目标）：** 服务端分页、用户/角色、审计日志、深色模式。`getExhibits` 上限（spec §5.3）在当前数据量下由前端分页覆盖，若数据增长再单独处理。
