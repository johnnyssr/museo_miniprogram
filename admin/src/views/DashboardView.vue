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
        <el-table-column prop="summary" label="简述" min-width="160" show-overflow-tooltip />
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
