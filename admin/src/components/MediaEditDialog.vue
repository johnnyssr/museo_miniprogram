<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  updateMedia, attachMediaToExhibit, detachMediaFromExhibit,
} from '../cloudbase'
import { usedByExhibits } from '../utils/mediaUsage'
import type { Media, MediaType } from '../types/media'
import type { Exhibit } from '../types/exhibit'

const props = defineProps<{
  modelValue: boolean
  media: Media | null
  mediaType: MediaType
  exhibits: Exhibit[]
  previewUrl?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean]; saved: [] }>()

const TYPE_LABEL: Record<MediaType, string> = { image: '图片', video: '视频', audio: '音频' }

const name = ref('')
const targetIds = ref<string[]>([])
const initialIds = ref<string[]>([])
const saving = ref(false)

const options = computed(() =>
  props.exhibits
    .filter((e) => e._id)
    .map((e) => ({ label: `${e.name}（${e.exhibitId}）`, value: e._id as string })),
)

function reset() {
  if (!props.media) return
  name.value = props.media.name
  const ids = usedByExhibits(props.media.fileID, props.exhibits)
    .map((e) => e._id as string)
    .filter(Boolean)
  initialIds.value = ids
  targetIds.value = [...ids]
}
watch(() => props.modelValue, (v) => { if (v) reset() })

function close() { emit('update:modelValue', false) }

async function save() {
  const m = props.media
  if (!m) return
  const newName = name.value.trim()
  if (!newName) { ElMessage.error('文件名不能为空'); return }

  const added = targetIds.value.filter((id) => !initialIds.value.includes(id))
  const removed = initialIds.value.filter((id) => !targetIds.value.includes(id))
  const byId = new Map(props.exhibits.map((e) => [e._id as string, e]))

  saving.value = true
  try {
    const jobs: Promise<void>[] = []
    if (newName !== m.name) jobs.push(updateMedia({ _id: m._id, name: newName }))
    for (const id of added) {
      const ex = byId.get(id)
      if (ex) jobs.push(attachMediaToExhibit(ex, m.fileID, props.mediaType))
    }
    for (const id of removed) {
      const ex = byId.get(id)
      if (ex) jobs.push(detachMediaFromExhibit(ex, m.fileID, props.mediaType))
    }
    await Promise.all(jobs)
    ElMessage.success('已保存')
    emit('saved')
    emit('update:modelValue', false)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue" :title="`编辑${TYPE_LABEL[mediaType]}`" width="520px"
    @update:model-value="close"
  >
    <div v-if="media" class="edit-body">
      <div v-if="mediaType === 'image' && previewUrl" class="edit-preview">
        <el-image :src="previewUrl" fit="cover" style="width: 100%; height: 100%" />
      </div>

      <el-form label-width="82px">
        <el-form-item label="文件名">
          <el-input v-model="name" placeholder="文件名（同时是按文件名关联展品的匹配钥匙）" />
        </el-form-item>
        <el-form-item label="对应展品">
          <el-select
            v-model="targetIds" multiple filterable clearable
            placeholder="选择该文件对应的展品（可多选）" style="width: 100%"
          >
            <el-option v-for="o in options" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
      </el-form>

      <p v-if="mediaType !== 'image'" class="hint">
        提示：{{ TYPE_LABEL[mediaType] }}每个展品只能有一个，对应后会替换该展品原有的{{ TYPE_LABEL[mediaType] }}。
      </p>
    </div>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="saving" @click="save">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.edit-body { display: flex; flex-direction: column; gap: 4px; }
.edit-preview {
  width: 100%; height: 200px; border-radius: 8px; overflow: hidden;
  margin-bottom: 12px; background: var(--ocean-placeholder);
}
.hint { color: var(--ocean-text-muted); font-size: 13px; margin: 0; }
</style>
