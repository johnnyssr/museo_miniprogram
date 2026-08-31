import type { Media, MediaType } from '../types/media'
import type { Exhibit } from '../types/exhibit'

// 媒体类型 → 写入的展品字段
const TYPE_FIELD: Record<MediaType, 'image' | 'videoUrl' | 'audioUrl'> = {
  image: 'image', video: 'videoUrl', audio: 'audioUrl',
}

export interface MatchPlanRow {
  media: Media
  exhibit?: Exhibit
  field?: 'image' | 'videoUrl' | 'audioUrl'
  hasValue: boolean // 目标字段是否已有值
  status: 'ok' | 'unmatched' | 'occupied' // 可关联 / 未匹配 / 已有值默认跳过
}

/** 去扩展名得到候选 exhibitId。 */
export function stripExt(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot > 0 ? filename.slice(0, dot) : filename
}

/**
 * 按文件名生成回填预览。
 * - 无匹配展品 → status 'unmatched'
 * - 目标字段已有值 → status 'occupied'（默认跳过，需勾选覆盖）
 * - 否则 → status 'ok'
 */
export function buildMatchPlan(mediaList: Media[], exhibits: Exhibit[]): MatchPlanRow[] {
  const byId = new Map(exhibits.map((e) => [e.exhibitId, e]))
  return mediaList.map((media) => {
    const candidate = stripExt(media.name)
    const exhibit = byId.get(candidate)
    if (!exhibit) return { media, hasValue: false, status: 'unmatched' as const }
    const field = TYPE_FIELD[media.type]
    const hasValue = !!exhibit[field]
    return { media, exhibit, field, hasValue, status: hasValue ? 'occupied' as const : 'ok' as const }
  })
}
