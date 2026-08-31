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
import { UploadFilled, VideoCamera, Headset } from '@element-plus/icons-vue'

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
