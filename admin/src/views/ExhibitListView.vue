<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import QRCode from 'qrcode'
import {
  fetchExhibits,
  deleteExhibit,
  logout,
  toPreviewUrl,
  fetchExhibitQRCode,
} from '../cloudbase'
import type { Exhibit } from '../types/exhibit'

const router = useRouter()
const loading = ref(false)
const rows = ref<Array<Exhibit & { _thumb?: string }>>([])

// 二维码弹窗状态
const qrVisible = ref(false)
const qrMode = ref<'text' | 'mp'>('text') // text=普通二维码（现在即用）, mp=小程序码（发布后用）
const qrLoading = ref(false)
const qrDataUrl = ref('')
const qrError = ref('')
const qrTarget = ref<{ exhibitId: string; name: string } | null>(null)

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

// 打开二维码弹窗（默认普通二维码，当前阶段即可用）
function openQR(row: Exhibit) {
  qrTarget.value = { exhibitId: row.exhibitId, name: row.name }
  qrMode.value = 'text'
  qrDataUrl.value = ''
  qrError.value = ''
  qrVisible.value = true
  renderQR()
}

// 切换模式 / 版本后重新生成
function renderQR() {
  if (qrMode.value === 'text') genTextQR()
  else loadMpQR()
}

// 普通文本二维码：前端生成，编码展品编号（小程序内「扫一扫」可识别）
async function genTextQR() {
  if (!qrTarget.value) return
  qrLoading.value = true
  qrError.value = ''
  qrDataUrl.value = ''
  try {
    qrDataUrl.value = await QRCode.toDataURL(qrTarget.value.exhibitId, { width: 240, margin: 1 })
  } catch (err) {
    qrError.value = err instanceof Error ? err.message : '生成二维码失败'
  } finally {
    qrLoading.value = false
  }
}

// 小程序码：调云函数生成（需配 AppSecret；正式版需小程序已发布）
async function loadMpQR() {
  if (!qrTarget.value) return
  qrLoading.value = true
  qrError.value = ''
  qrDataUrl.value = ''
  try {
    qrDataUrl.value = await fetchExhibitQRCode(qrTarget.value.exhibitId, 'release')
  } catch (err) {
    qrError.value = err instanceof Error ? err.message : '生成小程序码失败'
  } finally {
    qrLoading.value = false
  }
}

function downloadQR() {
  if (!qrDataUrl.value || !qrTarget.value) return
  const prefix = qrMode.value === 'text' ? 'qrcode-text' : 'qrcode-mp'
  const a = document.createElement('a')
  a.href = qrDataUrl.value
  a.download = `${prefix}-${qrTarget.value.exhibitId}.png`
  a.click()
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
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="goEdit(row)">编辑</el-button>
          <el-button link type="success" @click="openQR(row)">二维码</el-button>
          <el-button link type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="qrVisible" title="展品二维码" width="360">
      <div v-if="qrTarget" class="qr-body">
        <p class="qr-meta">{{ qrTarget.name }}（{{ qrTarget.exhibitId }}）</p>

        <el-radio-group v-model="qrMode" size="small" @change="renderQR">
          <el-radio-button value="text">普通二维码</el-radio-button>
          <el-radio-button value="mp">小程序码</el-radio-button>
        </el-radio-group>

        <div class="qr-canvas" v-loading="qrLoading">
          <el-image v-if="qrDataUrl" :src="qrDataUrl" style="width: 240px; height: 240px" />
          <el-alert v-else-if="qrError" :title="qrError" type="error" :closable="false" show-icon />
          <span v-else-if="!qrLoading" class="muted">生成中…</span>
        </div>

        <el-alert
          v-if="qrMode === 'text'"
          type="info"
          :closable="false"
          title="普通二维码：编码展品编号，仅小程序内「扫一扫」可识别跳转。当前未上线阶段即可用。"
        />
        <el-alert
          v-else
          type="info"
          :closable="false"
          title="小程序码：微信原生扫一扫也能进。需小程序已发布正式版后，游客扫码才生效。"
        />
      </div>
      <template #footer>
        <el-button @click="qrVisible = false">关闭</el-button>
        <el-button type="primary" :disabled="!qrDataUrl" @click="downloadQR">下载 PNG</el-button>
      </template>
    </el-dialog>
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
.qr-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.qr-meta {
  margin: 0;
  font-weight: 600;
  color: #3a2f22;
}
.qr-canvas {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 240px;
  min-height: 240px;
}
</style>
