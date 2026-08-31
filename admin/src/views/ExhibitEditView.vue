<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { fetchExhibits, createExhibit, updateExhibit } from '../cloudbase'
import { emptyExhibit, type Exhibit } from '../types/exhibit'
import MediaField from '../components/MediaField.vue'

const route = useRoute()
const router = useRouter()

// 路由带 :id（即 exhibitId）则为编辑模式
const editingId = computed(() => route.params.id as string | undefined)
const isEdit = computed(() => !!editingId.value)

const formRef = ref<FormInstance>()
const model = ref<Exhibit>(emptyExhibit())
const loading = ref(false)
const saving = ref(false)

const rules: FormRules = {
  exhibitId: [{ required: true, message: '请输入展品编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
}

async function load() {
  if (!isEdit.value) return
  loading.value = true
  try {
    const list = await fetchExhibits()
    const found = list.find((e) => e.exhibitId === editingId.value)
    if (!found) {
      ElMessage.error('未找到该展品')
      router.replace('/exhibits')
      return
    }
    model.value = { ...emptyExhibit(), ...found }
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载失败')
  } finally {
    loading.value = false
  }
}

async function onSave() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    return // 校验不通过
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await updateExhibit(model.value)
      ElMessage.success('已保存')
    } else {
      await createExhibit(model.value)
      ElMessage.success('已创建')
    }
    router.replace('/exhibits')
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '保存失败')
  } finally {
    saving.value = false
  }
}

function onCancel() {
  router.replace('/exhibits')
}

onMounted(load)
</script>

<template>
  <div class="edit-wrap" v-loading="loading">
    <h2 class="edit-title">{{ isEdit ? '编辑展品' : '新增展品' }}</h2>

    <el-form ref="formRef" :model="model" :rules="rules" label-width="90px">
      <el-form-item label="展品编号" prop="exhibitId">
        <el-input v-model="model.exhibitId" :disabled="isEdit" placeholder="如 exhibit-004" />
      </el-form-item>
      <el-form-item label="名称" prop="name">
        <el-input v-model="model.name" placeholder="展品名称" />
      </el-form-item>
      <el-form-item label="简述">
        <el-input v-model="model.summary" type="textarea" :rows="2" placeholder="一句话简述（选填）" />
      </el-form-item>
      <el-form-item label="文本描述">
        <el-input v-model="model.text" type="textarea" :rows="5" placeholder="展品介绍文字" />
      </el-form-item>
      <el-form-item label="图片">
        <MediaField v-model="model.image" kind="image" label="图片" />
      </el-form-item>
      <el-form-item label="音频">
        <MediaField v-model="model.audioUrl" kind="audio" label="音频" />
      </el-form-item>
      <el-form-item label="视频">
        <MediaField v-model="model.videoUrl" kind="video" label="视频" />
      </el-form-item>

      <el-form-item>
        <el-button type="primary" :loading="saving" @click="onSave">保存</el-button>
        <el-button @click="onCancel">取消</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.edit-wrap {
  max-width: 640px;
  margin: 0 auto;
}
.edit-title {
  color: var(--ocean-text-strong);
  margin-bottom: 16px;
}
</style>
