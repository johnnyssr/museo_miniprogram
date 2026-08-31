<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadMediaToLibrary, toPreviewUrl } from '../cloudbase'
import MediaPickerDialog from './MediaPickerDialog.vue'

const props = defineProps<{
  modelValue: string
  kind: 'image' | 'audio' | 'video'
  label: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

// 三种模式：上传到媒体库 / 从媒体库选择 / 直接填外链
const mode = ref<'upload' | 'library' | 'url'>('upload')
const pickerOpen = ref(false)
const uploading = ref(false)
const previewUrl = ref('')

// 根据当前值刷新预览（cloud:// 需换临时 URL）
async function refreshPreview() {
  previewUrl.value = props.modelValue ? await toPreviewUrl(props.modelValue) : ''
}
watch(() => props.modelValue, refreshPreview, { immediate: true })

const accept = { image: 'image/*', audio: 'audio/*', video: 'video/*' }[props.kind]

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
  return false // 阻止 el-upload 默认上传
}

function onPick(fileID: string) {
  emit('update:modelValue', fileID)
  ElMessage.success(`${props.label}已从媒体库选择`)
}

function onUrlInput(val: string) {
  emit('update:modelValue', val)
}
</script>

<template>
  <div class="media-field">
    <el-radio-group v-model="mode" size="small">
      <el-radio-button value="upload">上传</el-radio-button>
      <el-radio-button value="library">媒体库</el-radio-button>
      <el-radio-button value="url">外链</el-radio-button>
    </el-radio-group>

    <div class="media-body">
      <el-upload
        v-if="mode === 'upload'"
        :accept="accept"
        :show-file-list="false"
        :before-upload="onFile"
      >
        <el-button :loading="uploading">选择{{ label }}文件</el-button>
      </el-upload>

      <el-button v-else-if="mode === 'library'" @click="pickerOpen = true">从媒体库选择</el-button>

      <el-input
        v-else
        :model-value="modelValue"
        placeholder="粘贴 https:// 链接"
        @update:model-value="onUrlInput"
      />
    </div>

    <!-- 预览 / 当前值 -->
    <div v-if="modelValue" class="media-preview">
      <el-image
        v-if="kind === 'image' && previewUrl"
        :src="previewUrl"
        fit="cover"
        style="width: 120px; height: 120px; border-radius: 8px"
      />
      <audio v-else-if="kind === 'audio' && previewUrl" :src="previewUrl" controls />
      <video
        v-else-if="kind === 'video' && previewUrl"
        :src="previewUrl"
        controls
        style="max-width: 240px"
      />
      <div class="media-value">{{ modelValue }}</div>
    </div>

    <MediaPickerDialog v-model="pickerOpen" :kind="kind" @pick="onPick" />
  </div>
</template>

<style scoped>
.media-body {
  margin: 8px 0;
}
.media-preview {
  margin-top: 8px;
}
.media-value {
  font-size: 12px;
  color: var(--ocean-text-muted);
  word-break: break-all;
  margin-top: 4px;
}
</style>
