import type { Media, MediaType } from '../types/media'
import type { Exhibit } from '../types/exhibit'
import { exhibitImages } from '../types/exhibit'

// 媒体类型 → 写入的展品字段
const TYPE_FIELD: Record<MediaType, 'image' | 'videoUrl' | 'audioUrl'> = {
  image: 'image', video: 'videoUrl', audio: 'audioUrl',
}

export interface MatchPlanRow {
  media: Media
  exhibit?: Exhibit
  field?: 'image' | 'videoUrl' | 'audioUrl'
  seq?: number // 仅图片：「编号-序号」中的序号，用于排序；无序号视为 0
  hasValue: boolean // 图片=已在图集中；音/视频=目标字段已有值
  status: 'ok' | 'unmatched' | 'occupied' // 可关联 / 未匹配 / 已存在默认跳过
}

/** 去扩展名得到文件名主体。 */
export function stripExt(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot > 0 ? filename.slice(0, dot) : filename
}

/**
 * 图片文件名解析：支持「编号」或「编号-序号 / 编号_序号」。
 * exhibitId 自身可能含「-」（如 exhibit-001），故先整体精确匹配，
 * 再尝试剥离结尾的 [-_]数字 得到候选编号。
 */
function matchImage(
  base: string,
  byId: Map<string, Exhibit>,
): { exhibit: Exhibit; seq: number } | undefined {
  const exact = byId.get(base)
  if (exact) return { exhibit: exact, seq: 0 }
  const m = base.match(/^(.*)[-_](\d+)$/)
  if (m) {
    const ex = byId.get(m[1])
    if (ex) return { exhibit: ex, seq: Number(m[2]) }
  }
  return undefined
}

/**
 * 按文件名生成回填预览。
 * - 无匹配展品 → 'unmatched'
 * - 图片已在图集中 / 音视频字段已有值 → 'occupied'（默认跳过）
 * - 否则 → 'ok'（图片为追加，音视频为写入）
 */
export function buildMatchPlan(mediaList: Media[], exhibits: Exhibit[]): MatchPlanRow[] {
  const byId = new Map(exhibits.map((e) => [e.exhibitId, e]))
  return mediaList.map((media) => {
    const base = stripExt(media.name)
    const field = TYPE_FIELD[media.type]

    if (media.type === 'image') {
      const hit = matchImage(base, byId)
      if (!hit) return { media, field, hasValue: false, status: 'unmatched' as const }
      const hasValue = exhibitImages(hit.exhibit).includes(media.fileID)
      return {
        media, exhibit: hit.exhibit, field, seq: hit.seq, hasValue,
        status: hasValue ? ('occupied' as const) : ('ok' as const),
      }
    }

    // 音频 / 视频：文件名主体 = 编号，写入单值字段
    const exhibit = byId.get(base)
    if (!exhibit) return { media, field, hasValue: false, status: 'unmatched' as const }
    const hasValue = !!exhibit[field]
    return { media, exhibit, field, hasValue, status: hasValue ? ('occupied' as const) : ('ok' as const) }
  })
}
