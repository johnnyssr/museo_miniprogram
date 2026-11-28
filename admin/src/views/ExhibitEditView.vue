<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { fetchExhibits, createExhibit, updateExhibit } from '../cloudbase'
import { emptyExhibit, exhibitImages, type Exhibit } from '../types/exhibit'
import { CATEGORIES } from '../constants/categories'
import { friendlyError } from '../utils/errors'
import MediaField from '../components/MediaField.vue'
import MultiImageField from '../components/MultiImageField.vue'

const route = useRoute()
const router = useRouter()

// 路由带 :id（即 exhibitId）则为编辑模式
const editingId = computed(() => route.params.id as string | undefined)
const isEdit = computed(() => !!editingId.value)

const formRef = ref<FormInstance>()
const model = ref<Exhibit>(emptyExhibit())
const loading = ref(false)
const saving = ref(false)

// 未保存离开保护：加载后记录快照，与当前表单比较得出是否有改动
const pristine = ref('')
const bypassGuard = ref(false)
const dirty = computed(() => JSON.stringify(model.value) !== pristine.value)

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
      bypassGuard.value = true
      router.replace('/exhibits')
      return
    }
    model.value = { ...emptyExhibit(), ...found }
    // 归一化图集：旧数据只有单 image 时，转成 images 数组供多图编辑器显示
    model.value.images = exhibitImages(found)
  } catch (err) {
    ElMessage.error(friendlyError(err, '加载失败'))
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
    bypassGuard.value = true
    router.replace('/exhibits')
  } catch (err) {
    ElMessage.error(friendlyError(err, '保存失败'))
  } finally {
    saving.value = false
  }
}

function onCancel() {
  bypassGuard.value = true
  router.replace('/exhibits')
}

// 路由内跳走时，若有未保存改动则二次确认
onBeforeRouteLeave(async () => {
  if (bypassGuard.value || !dirty.value) return true
  try {
    await ElMessageBox.confirm('当前有未保存的修改，确定离开吗？', '离开确认', {
      type: 'warning', confirmButtonText: '离开', cancelButtonText: '留下',
    })
    return true
  } catch {
    return false
  }
})

// 关闭 / 刷新浏览器标签时的原生拦截
function onBeforeUnload(e: BeforeUnloadEvent) {
  if (dirty.value && !bypassGuard.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

onMounted(async () => {
  await load()
  pristine.value = JSON.stringify(model.value)
  window.addEventListener('beforeunload', onBeforeUnload)
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
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
      <el-form-item label="分类">
        <el-select v-model="model.category" placeholder="选择分类（选填）" clearable style="width: 200px">
          <el-option v-for="c in CATEGORIES" :key="c" :label="c" :value="c" />
        </el-select>
      </el-form-item>
      <el-form-item label="文本描述">
        <el-input v-model="model.text" type="textarea" :rows="5" placeholder="展品介绍文字" />
      </el-form-item>
      <el-form-item label="图片">
        <MultiImageField v-model="model.images" />
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
