<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { updateExhibit } from '../cloudbase'
import { runBatch } from '../utils/batch'
import { buildMatchPlan, type MatchPlanRow } from '../utils/mediaMatch'
import type { Media } from '../types/media'
import type { Exhibit } from '../types/exhibit'
import { exhibitImages } from '../types/exhibit'

const props = defineProps<{
  modelValue: boolean
  mediaList: Media[]
  exhibits: Exhibit[]
}>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean]; applied: [] }>()

const rows = ref<MatchPlanRow[]>([])
const checked = ref<Record<string, boolean>>({})
const applying = ref(false)

const STATUS_TEXT: Record<MatchPlanRow['status'], string> = {
  ok: '可关联', unmatched: '未匹配，跳过', occupied: '已存在，跳过',
}

function rebuild() {
  rows.value = buildMatchPlan(props.mediaList, props.exhibits)
  const init: Record<string, boolean> = {}
  for (const r of rows.value) {
    if (r.media._id) init[r.media._id] = r.status === 'ok'
  }
  checked.value = init
}
watch(() => props.modelValue, (v) => { if (v) rebuild() })

function isSelected(r: MatchPlanRow): boolean {
  return r.status !== 'unmatched' && !!r.media._id && !!checked.value[r.media._id]
}

const selectableCount = computed(() => rows.value.filter(isSelected).length)

async function apply() {
  const targets = rows.value.filter((r) => isSelected(r) && r.exhibit && r.field)
  if (!targets.length) { ElMessage.info('没有勾选任何可关联项'); return }
  applying.value = true
  try {
    // 每个展品一个写入任务，避免并发互相覆盖：
    //  - 图片：把匹配到该展品的多张按序号追加进 images（去重）
    //  - 音/视频：写入对应单值字段
    const jobs: Array<() => Promise<void>> = []

    for (const r of targets.filter((t) => t.field !== 'image')) {
      const ex = r.exhibit as Exhibit
      jobs.push(async () => {
        await updateExhibit({ _id: ex._id, [r.field as string]: r.media.fileID } as unknown as Exhibit)
      })
    }

    const imageByExhibit = new Map<string, { exhibit: Exhibit; rows: MatchPlanRow[] }>()
    for (const r of targets.filter((t) => t.field === 'image')) {
      const ex = r.exhibit as Exhibit
      const key = ex._id as string
      if (!imageByExhibit.has(key)) imageByExhibit.set(key, { exhibit: ex, rows: [] })
      imageByExhibit.get(key)!.rows.push(r)
    }
    for (const g of imageByExhibit.values()) {
      jobs.push(async () => {
        const existing = exhibitImages(g.exhibit)
        const additions = g.rows
          .slice()
          .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
          .map((r) => r.media.fileID)
          .filter((id) => !existing.includes(id))
        await updateExhibit({ _id: g.exhibit._id, images: [...existing, ...additions] } as unknown as Exhibit)
      })
    }

    const res = await runBatch(jobs, (job) => job(), 5)
    const skipped = rows.value.length - targets.length
    if (res.failed.length) {
      ElMessage.warning(`关联完成：${res.failed.length} 个写入失败（${res.failed[0].error}），跳过 ${skipped}`)
    } else {
      ElMessage.success(`成功关联 ${targets.length} 个文件，跳过 ${skipped}`)
    }
    emit('applied')
    emit('update:modelValue', false)
  } finally {
    applying.value = false
  }
}

function close() { emit('update:modelValue', false) }
</script>

<template>
  <el-dialog
    :model-value="modelValue" title="按文件名关联展品" width="720px"
    @update:model-value="close"
  >
    <p class="hint">
      文件名（去扩展名）= 展品编号即可自动匹配。图片支持「编号-序号」（如 exhibit-001、exhibit-001-2）按序号追加进图集；音/视频写入对应字段。已存在的默认跳过。
    </p>
    <el-table :data="rows" max-height="420">
      <el-table-column width="52">
        <template #default="{ row }">
          <el-checkbox
            v-if="row.status !== 'unmatched' && row.media._id"
            v-model="checked[row.media._id as string]"
          />
        </template>
      </el-table-column>
      <el-table-column prop="media.name" label="文件名" min-width="160" />
      <el-table-column label="匹配展品" min-width="160">
        <template #default="{ row }">
          <span v-if="row.exhibit">{{ row.exhibit.name }}（{{ row.exhibit.exhibitId }}）</span>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="field" label="写入字段" width="100">
        <template #default="{ row }">{{ row.field || '—' }}</template>
      </el-table-column>
      <el-table-column label="当前值" width="90">
        <template #default="{ row }">
          <span :class="{ muted: !row.hasValue }">{{ row.hasValue ? '已有值' : '空' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="140">
        <template #default="{ row }">
          <el-tag
            :type="row.status === 'ok' ? 'success' : row.status === 'occupied' ? 'warning' : 'info'"
            size="small"
          >{{ STATUS_TEXT[row.status as MatchPlanRow['status']] }}</el-tag>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="applying" :disabled="!selectableCount" @click="apply">
        应用（{{ selectableCount }}）
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.hint { color: var(--ocean-text-muted); font-size: 13px; margin-bottom: 8px; }
.muted { color: var(--ocean-text-hint); }
</style>
