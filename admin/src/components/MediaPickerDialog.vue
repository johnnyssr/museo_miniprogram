<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchMedia, toPreviewUrl } from '../cloudbase'
import type { Media } from '../types/media'
import { VideoCamera, Headset } from '@element-plus/icons-vue'

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

<style scoped>
.picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; min-height: 120px; }
.pick-card { border: 1px solid var(--ocean-border); border-radius: 8px; padding: 6px; cursor: pointer; }
.pick-card:hover { border-color: var(--ocean-primary); box-shadow: 0 2px 8px var(--ocean-shadow); }
.pick-thumb { height: 100px; border-radius: 6px; overflow: hidden; background: var(--ocean-placeholder); display: flex; align-items: center; justify-content: center; }
.pick-icon { font-size: 40px; color: var(--ocean-primary); }
.pick-name { font-size: 12px; color: var(--ocean-text-strong); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pick-empty { text-align: center; color: var(--ocean-text-muted); padding: 32px 0; }
</style>
