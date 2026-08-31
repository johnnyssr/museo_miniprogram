<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { uploadMediaToLibrary, toPreviewUrl } from '../cloudbase'
import MediaPickerDialog from './MediaPickerDialog.vue'

// 展品图集编辑：支持多张图片，增 / 删 / 设为封面。第一张为封面。
const props = defineProps<{ modelValue: string[] | undefined }>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

// 新增来源：上传到媒体库 / 从媒体库选择 / 直接填外链
const mode = ref<'upload' | 'library' | 'url'>('upload')
const pickerOpen = ref(false)
const uploading = ref(false)
const urlInput = ref('')
const previews = ref<string[]>([]) // 与 modelValue 等长的可预览 URL（cloud:// 需换临时链接）

async function refreshPreviews() {
  const list = props.modelValue || []
  previews.value = await Promise.all(list.map((u) => toPreviewUrl(u)))
}
watch(() => props.modelValue, refreshPreviews, { immediate: true, deep: true })

function update(next: string[]) {
  emit('update:modelValue', next)
}

async function onFile(file: File) {
  uploading.value = true
  try {
    const media = await uploadMediaToLibrary(file)
    update([...(props.modelValue || []), media.fileID])
    ElMessage.success('图片上传成功，已存入媒体库')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '上传失败')
  } finally {
    uploading.value = false
  }
  return false // 阻止 el-upload 默认上传
}

function onPick(fileID: string) {
  update([...(props.modelValue || []), fileID])
  ElMessage.success('已从媒体库添加图片')
}

function addUrl() {
  const v = urlInput.value.trim()
  if (!v) return
  update([...(props.modelValue || []), v])
  urlInput.value = ''
}

function removeAt(i: number) {
  const next = (props.modelValue || []).slice()
  next.splice(i, 1)
  update(next)
}

// 把第 i 张移到最前，成为封面
function setCover(i: number) {
  if (i <= 0) return
  const next = (props.modelValue || []).slice()
  const [item] = next.splice(i, 1)
  next.unshift(item)
  update(next)
}
</script>

<template>
  <div class="multi-image-field">
    <div v-if="modelValue && modelValue.length" class="thumbs">
      <div v-for="(u, i) in modelValue" :key="u + i" class="thumb-item">
        <el-image
          :src="previews[i]"
          fit="cover"
          class="thumb-img"
          :preview-src-list="previews"
          :initial-index="i"
          preview-teleported
        />
        <span v-if="i === 0" class="cover-badge">封面</span>
        <div class="thumb-actions">
          <el-button v-if="i !== 0" link size="small" @click="setCover(i)">设为封面</el-button>
          <el-button link type="danger" size="small" @click="removeAt(i)">删除</el-button>
        </div>
      </div>
    </div>

    <el-radio-group v-model="mode" size="small">
      <el-radio-button value="upload">上传</el-radio-button>
      <el-radio-button value="library">媒体库</el-radio-button>
      <el-radio-button value="url">外链</el-radio-button>
    </el-radio-group>

    <div class="add-body">
      <el-upload
        v-if="mode === 'upload'"
        accept="image/*"
        :show-file-list="false"
        :before-upload="onFile"
      >
        <el-button :loading="uploading">＋ 上传图片</el-button>
      </el-upload>

      <el-button v-else-if="mode === 'library'" @click="pickerOpen = true">＋ 从媒体库选择</el-button>

      <div v-else class="url-add">
        <el-input v-model="urlInput" placeholder="粘贴 https:// 链接" @keyup.enter="addUrl" />
        <el-button @click="addUrl">添加</el-button>
      </div>
    </div>

    <p class="tip">支持多张图片，第一张为封面（可「设为封面」调整）。</p>

    <MediaPickerDialog v-model="pickerOpen" kind="image" @pick="onPick" />
  </div>
</template>

<style scoped>
.thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}
.thumb-item {
  position: relative;
  width: 120px;
}
.thumb-img {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  display: block;
}
.cover-badge {
  position: absolute;
  top: 4px;
  left: 4px;
  padding: 1px 8px;
  font-size: 12px;
  color: #fff;
  background: var(--ocean-primary);
  border-radius: 4px;
}
.thumb-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 2px;
}
.add-body {
  margin: 8px 0;
}
.url-add {
  display: flex;
  gap: 8px;
}
.tip {
  font-size: 12px;
  color: var(--ocean-text-muted);
  margin: 4px 0 0;
}
</style>
