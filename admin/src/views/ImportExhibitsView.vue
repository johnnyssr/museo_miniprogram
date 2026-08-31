<template>
  <el-card shadow="never">
    <el-steps :active="step" finish-status="success" simple>
      <el-step title="下载模板" />
      <el-step title="上传解析" />
      <el-step title="预览校验" />
      <el-step title="确认导入" />
    </el-steps>

    <div class="step-body">
      <el-alert type="info" :closable="false"
        title="媒体文件说明：图片/音频/视频列只能填写已有的 https:// 或 cloud:// 链接，导入不会上传本地文件。" />

      <div v-if="step <= 1" class="actions">
        <el-button type="primary" @click="downloadTemplate">下载 CSV 模板</el-button>
        <el-upload :auto-upload="false" :show-file-list="false" accept=".csv" :on-change="onFile">
          <el-button>上传 CSV</el-button>
        </el-upload>
      </div>

      <div v-if="step >= 2">
        <el-table :data="rows" size="small" max-height="420">
          <el-table-column prop="rowIndex" label="行" width="60" />
          <el-table-column prop="data.exhibitId" label="编号" width="140" />
          <el-table-column prop="data.name" label="名称" />
          <el-table-column prop="data.summary" label="简述" min-width="140" show-overflow-tooltip />
          <el-table-column label="校验" width="240">
            <template #default="{ row }">
              <el-tag v-if="!row.errors.length" type="success">合法</el-tag>
              <el-tag v-else type="danger">{{ row.errors.join('；') }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <div class="summary">
          合法 {{ validRows.length }} 行，错误 {{ rows.length - validRows.length }} 行（错误行将被跳过）
        </div>
        <el-button type="primary" :disabled="!validRows.length" :loading="importing" @click="doImport">
          导入 {{ validRows.length }} 条
        </el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { saveAs } from 'file-saver'
import { buildTemplateCsv, parseAndValidate, type ParsedRow } from '../utils/csv'
import { fetchExhibits, createExhibitsBatch } from '../cloudbase'

const step = ref(1)
const rows = ref<ParsedRow[]>([])
const importing = ref(false)
const validRows = computed(() => rows.value.filter(r => !r.errors.length))

function downloadTemplate() {
  saveAs(new Blob(['﻿' + buildTemplateCsv()], { type: 'text/csv;charset=utf-8' }), 'exhibit-template.csv')
}

async function onFile(file: { raw: File }) {
  try {
    const text = await file.raw.text()
    const existing = await fetchExhibits()
    const ids = new Set(existing.map(e => e.exhibitId))
    rows.value = parseAndValidate(text, ids)
    step.value = 2
  } catch (err) {
    ElMessage.error(err instanceof Error ? err.message : '读取或解析 CSV 失败')
  }
}

async function doImport() {
  importing.value = true
  try {
    const res = await createExhibitsBatch(validRows.value.map(r => r.data))
    if (res.failed.length) {
      ElMessage.error(`导入完成：成功 ${res.ok.length}，失败 ${res.failed.length}。首个失败：${res.failed[0].error}`)
    } else {
      ElMessage.success(`成功导入 ${res.ok.length} 条`)
    }
    // 导入后回到起点，并清空已解析行，避免下次校验命中过期的库内编号
    rows.value = []
    step.value = 1
  } finally { importing.value = false }
}
</script>

<style scoped>
.step-body { margin-top: 20px; display: flex; flex-direction: column; gap: 16px; }
.actions { display: flex; gap: 12px; }
.summary { margin: 12px 0; color: var(--ocean-text-muted); }
</style>
