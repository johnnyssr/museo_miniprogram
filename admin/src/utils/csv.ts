import Papa from 'papaparse'
import type { Exhibit } from '../types/exhibit'

export const CSV_HEADERS = ['exhibitId', 'name', 'summary', 'text', 'image', 'audioUrl', 'videoUrl'] as const

export interface ParsedRow {
  data: Partial<Exhibit>
  rowIndex: number
  errors: string[]   // 校验错误，空数组=合法
}

/** 生成模板 CSV 文本（含表头 + 一行示例） */
export function buildTemplateCsv(): string {
  const example = ['exhibit-001', '示例展品', '一句话简述', '这里填文字介绍', 'https://…/1.png|https://…/2.png', 'cloud://…/audio.mp3', '']
  return Papa.unparse([CSV_HEADERS as unknown as string[], example])
}

/**
 * 解析并校验 CSV 文本。
 * @param text CSV 内容
 * @param existingIds 库中已存在的 exhibitId 集合（用于查重）
 */
export function parseAndValidate(text: string, existingIds: Set<string>): ParsedRow[] {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), { header: true, skipEmptyLines: true })
  const seen = new Set<string>()
  return parsed.data.map((raw, i) => {
    // 图片列支持一格多张，用「|」分隔
    const images = (raw.image || '')
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
    const data: Partial<Exhibit> = {
      exhibitId: (raw.exhibitId || '').trim(),
      name: (raw.name || '').trim(),
      summary: (raw.summary || '').trim(),
      text: (raw.text || '').trim(),
      images,
      audioUrl: (raw.audioUrl || '').trim(),
      videoUrl: (raw.videoUrl || '').trim(),
    }
    const errors: string[] = []
    if (!data.exhibitId) errors.push('缺少编号 exhibitId')
    if (!data.name) errors.push('缺少名称 name')
    if (data.exhibitId && existingIds.has(data.exhibitId)) errors.push('编号已存在于库中')
    if (data.exhibitId && seen.has(data.exhibitId)) errors.push('文件内编号重复')
    if (data.exhibitId) seen.add(data.exhibitId)
    return { data, rowIndex: i + 2, errors } // +2: 表头占第1行，数据从第2行起
  })
}
