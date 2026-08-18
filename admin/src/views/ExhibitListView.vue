<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fetchExhibits, deleteExhibit, logout, toPreviewUrl } from '../cloudbase'
import type { Exhibit } from '../types/exhibit'

const router = useRouter()
const loading = ref(false)
const rows = ref<Array<Exhibit & { _thumb?: string }>>([])

async function load() {
  loading.value = true
  try {
    const list = await fetchExhibits()
    // 逐条把 cloud:// 缩略图换成可预览的临时 URL
    rows.value = await Promise.all(
      list.map(async (e) => ({ ...e, _thumb: await toPreviewUrl(e.image) })),
    )
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '加载失败')
  } finally {
    loading.value = false
  }
}

function goNew() {
  router.push('/exhibits/new')
}

function goEdit(row: Exhibit) {
  router.push(`/exhibits/${row.exhibitId}/edit`)
}

async function onDelete(row: Exhibit) {
  try {
    await ElMessageBox.confirm(`确定删除展品「${row.name}」（${row.exhibitId}）吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return // 用户取消
  }
  try {
    await deleteExhibit({ _id: row._id, exhibitId: row.exhibitId })
    ElMessage.success('已删除')
    await load()
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '删除失败')
  }
}

async function onLogout() {
  await logout()
  router.replace('/login')
}

onMounted(load)
</script>

<template>
  <div class="list-wrap">
    <div class="toolbar">
      <el-button type="primary" @click="goNew">新增展品</el-button>
      <div class="toolbar-right">
        <el-button link @click="load">刷新</el-button>
        <el-button link @click="onLogout">退出登录</el-button>
      </div>
    </div>

    <el-table :data="rows" v-loading="loading" border stripe empty-text="暂无展品">
      <el-table-column label="图片" width="90">
        <template #default="{ row }">
          <el-image
            v-if="row._thumb"
            :src="row._thumb"
            fit="cover"
            style="width: 56px; height: 56px; border-radius: 6px"
          />
          <span v-else class="muted">无</span>
        </template>
      </el-table-column>
      <el-table-column prop="exhibitId" label="编号" width="140" />
      <el-table-column prop="name" label="名称" min-width="160" />
      <el-table-column prop="dynasty" label="朝代" width="120" />
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="goEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.list-wrap {
  max-width: 960px;
  margin: 0 auto;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.muted {
  color: #8a7d6a;
}
</style>
