<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { appendImagesToExhibit } from '../cloudbase'
import type { Media } from '../types/media'
import type { Exhibit } from '../types/exhibit'

const props = defineProps<{
  modelValue: boolean
  mediaList: Media[]
  exhibits: Exhibit[]
}>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean]; assigned: [] }>()

const targetId = ref('')
const saving = ref(false)

const options = computed(() =>
  props.exhibits
    .filter((e) => e._id)
    .map((e) => ({ label: `${e.name}（${e.exhibitId}）`, value: e._id as string })),
)

watch(() => props.modelValue, (v) => { if (v) targetId.value = '' })

function close() { emit('update:modelValue', false) }

async function confirm() {
  if (!targetId.value) { ElMessage.error('请选择目标展品'); return }
  const ex = props.exhibits.find((e) => e._id === targetId.value)
  if (!ex) return
  saving.value = true
  try {
    await appendImagesToExhibit(ex, props.mediaList.map((m) => m.fileID))
    ElMessage.success(`已把 ${props.mediaList.length} 张图片追加到「${ex.name}」`)
    emit('assigned')
    emit('update:modelValue', false)
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '对应失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <el-dialog
    :model-value="modelValue" title="批量对应展品" width="480px"
    @update:model-value="close"
  >
    <p class="hint">把选中的 {{ mediaList.length }} 张图片追加进所选展品的图集（已在该展品图集里的会自动跳过）。</p>
    <el-select
      v-model="targetId" filterable clearable
      placeholder="选择目标展品" style="width: 100%"
    >
      <el-option v-for="o in options" :key="o.value" :label="o.label" :value="o.value" />
    </el-select>
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="saving" :disabled="!targetId" @click="confirm">
        对应（{{ mediaList.length }}）
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.hint { color: var(--ocean-text-muted); font-size: 13px; margin-bottom: 10px; }
</style>
