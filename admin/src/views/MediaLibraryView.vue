<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadRawFile } from 'element-plus'
import {
  fetchMedia, uploadMediaBatch, deleteMediaBatch,
  fetchExhibits, toPreviewUrl,
} from '../cloudbase'
import type { Media, MediaType } from '../types/media'
import type { Exhibit } from '../types/exhibit'
import { countUsage, usedByExhibits } from '../utils/mediaUsage'
import { UploadFilled, VideoCamera, Headset } from '@element-plus/icons-vue'
import MediaMatchDialog from '../components/MediaMatchDialog.vue'
import MediaEditDialog from '../components/MediaEditDialog.vue'
import MediaAssignDialog from '../components/MediaAssignDialog.vue'

const route = useRoute()
const mediaType = computed(() => route.meta.mediaType as MediaType)

const TYPE_LABEL: Record<MediaType, string> = { image: '图片', video: '视频', audio: '音频' }
const ACCEPT: Record<MediaType, string> = { image: 'image/*', video: 'video/*', audio: 'audio/*' }
const label = computed(() => TYPE_LABEL[mediaType.value])

const loading = ref(false)
const list = ref<Media[]>([])
const exhibits = ref<Exhibit[]>([])
const keyword = ref('')
const matchOpen = ref(false)
const editOpen = ref(false)
const assignOpen = ref(false)
const selected = ref<Media[]>([])
const uploading = ref(false)
const progress = ref(0)
const previews = ref<Record<string, string>>({}) // fileID -> 临时 url（仅图片）

const filtered = computed(() =>
  list.value.filter((m) => m.name.toLowerCase().includes(keyword.value.trim().toLowerCase())),
)

// 单选时的编辑目标（恰好选中 1 个才有值）
const editTarget = computed<Media | null>(() => (selected.value.length === 1 ? selected.value[0] : null))
const allChecked = computed(() => filtered.value.length > 0 && selected.value.length === filtered.value.length)

async function load() {
  selected.value = []
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

async function onDeleteSelected() {
  if (!selected.value.length) return
  if (!(await confirmUsage(selected.value))) return
  const res = await deleteMediaBatch(selected.value)
  if (res.failed.length) {
    ElMessage.warning(`删除完成：成功 ${res.ok.length}，失败 ${res.failed.length}（${res.failed[0].error}）`)
  } else {
    ElMessage.success(`已删除 ${res.ok.length} 个`)
  }
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
function toggleAll() {
  selected.value = allChecked.value ? [] : [...filtered.value]
}
function clearSelection() {
  selected.value = []
}

function fmtSize(n: number): string {
  if (!n || n <= 0) return '大小未知' // 早期缺失 size 的记录，避免显示误导性的 0 B
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

watch(mediaType, load, { immediate: true })
</script>

<template>
  <div class="media-lib" v-loading="loading">
    <div class="lib-head">
      <h2 class="lib-title">{{ label }}管理</h2>
      <div class="lib-actions">
        <el-input v-model="keyword" placeholder="按文件名搜索" clearable style="width: 220px" />
        <el-button type="primary" plain @click="matchOpen = true">按文件名关联展品</el-button>
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

    <!-- 选择工具条：全选 + 选中后操作 -->
    <div class="sel-bar">
      <el-checkbox
        :model-value="allChecked" :indeterminate="selected.length > 0 && !allChecked"
        :disabled="!filtered.length" @change="toggleAll"
      >全选</el-checkbox>

      <template v-if="selected.length">
        <span class="sel-count">已选 {{ selected.length }}</span>
        <el-button v-if="selected.length === 1" size="small" @click="editOpen = true">编辑</el-button>
        <el-button
          v-if="mediaType === 'image' && selected.length > 1"
          size="small" type="primary" plain @click="assignOpen = true"
        >批量对应展品</el-button>
        <el-button size="small" type="danger" plain @click="onDeleteSelected">删除选中</el-button>
        <el-button size="small" text @click="clearSelection">取消选择</el-button>
      </template>
      <span v-else class="sel-hint">
        选中 1 个可编辑名称与对应展品；{{ mediaType === 'image' ? '多选可批量对应展品或批量删除' : '多选可批量删除' }}
      </span>
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
      </div>
    </div>

    <MediaMatchDialog
      v-model="matchOpen"
      :media-list="list"
      :exhibits="exhibits"
      @applied="load"
    />
    <MediaEditDialog
      v-model="editOpen"
      :media="editTarget"
      :media-type="mediaType"
      :exhibits="exhibits"
      :preview-url="editTarget ? previews[editTarget.fileID] : ''"
      @saved="load"
    />
    <MediaAssignDialog
      v-model="assignOpen"
      :media-list="selected"
      :exhibits="exhibits"
      @assigned="load"
    />
  </div>
</template>

<style scoped>
.lib-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.lib-title { color: var(--ocean-text-strong); }
.lib-actions { display: flex; gap: 8px; align-items: center; }
.lib-upload { display: block; }
.upload-inner { padding: 16px; color: var(--ocean-text-body); }
.upload-icon { font-size: 40px; color: var(--ocean-primary); }
.upload-bar { display: flex; align-items: center; gap: 12px; margin: 12px 0 12px; }
.sel-bar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 8px 12px; margin-bottom: 16px; min-height: 40px;
  background: var(--ocean-primary-bg); border-radius: 8px;
}
.sel-count { font-size: 13px; color: var(--ocean-text-strong); font-weight: 600; }
.sel-hint { font-size: 12px; color: var(--ocean-text-muted); }
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
</style>
