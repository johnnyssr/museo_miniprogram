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
          <span>展品统计</span>
          <div>
            <el-button type="primary" @click="$router.push('/exhibits/new')">新增展品</el-button>
            <el-button @click="$router.push('/import')">批量导入</el-button>
          </div>
        </div>
      </template>
      <el-table :data="rows" size="small" class="recent-table" @row-click="openEdit">
        <el-table-column prop="exhibitId" label="编号" width="140" />
        <el-table-column prop="name" label="名称" min-width="120" />
        <el-table-column prop="summary" label="简述" min-width="160" show-overflow-tooltip />
        <el-table-column label="图片" width="70" align="center">
          <template #default="{ row }">{{ imageCount(row) }}</template>
        </el-table-column>
        <el-table-column label="音频" width="70" align="center">
          <template #default="{ row }">{{ row.audioUrl ? 1 : 0 }}</template>
        </el-table-column>
        <el-table-column label="视频" width="70" align="center">
          <template #default="{ row }">{{ row.videoUrl ? 1 : 0 }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchExhibits } from '../cloudbase'
import type { Exhibit } from '../types/exhibit'
import { exhibitImages } from '../types/exhibit'

const router = useRouter()
const loading = ref(false)
const items = ref<Exhibit[]>([])

function openEdit(row: Exhibit) {
  if (!row.exhibitId) return
  router.push(`/exhibits/${row.exhibitId}/edit`)
}

const imageCount = (e: Exhibit) => exhibitImages(e).length

onMounted(async () => {
  loading.value = true
  try { items.value = await fetchExhibits() } finally { loading.value = false }
})

const stats = computed(() => {
  const list = items.value
  const withMedia = (k: keyof Exhibit) => list.filter(e => !!e[k]).length
  const withImage = list.filter(e => exhibitImages(e).length > 0).length
  return [
    { label: '展品总数', value: list.length },
    { label: '含图片', value: withImage },
    { label: '含音频', value: withMedia('audioUrl') },
    { label: '含视频', value: withMedia('videoUrl') },
  ]
})

const rows = computed(() => items.value)
</script>

<style scoped>
.stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card { text-align: center; }
.stat-value { font-size: 28px; font-weight: 700; color: var(--ocean-primary); }
.stat-label { margin-top: 6px; color: var(--ocean-text-muted); font-size: 13px; }
.recent-head { display: flex; align-items: center; justify-content: space-between; }
.recent-table :deep(.el-table__row) { cursor: pointer; }
</style>
