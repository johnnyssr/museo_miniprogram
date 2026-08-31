import type { Exhibit } from '../types/exhibit'
import { exhibitImages } from '../types/exhibit'

// 展品里可能引用媒体的单值字段（图集 images 另行展开处理）
const SINGLE_REF_FIELDS: (keyof Exhibit)[] = ['audioUrl', 'videoUrl']

/** 某展品引用的全部 fileID（展开图集 + 单值字段）。 */
function refsOf(e: Exhibit): string[] {
  return [...exhibitImages(e), ...SINGLE_REF_FIELDS.map((f) => e[f] as string)].filter(Boolean)
}

/** 返回引用了该 fileID 的展品列表（任意字段/图集命中即算）。 */
export function usedByExhibits(fileID: string, exhibits: Exhibit[]): Exhibit[] {
  if (!fileID) return []
  return exhibits.filter((e) => refsOf(e).includes(fileID))
}

/** 引用该 fileID 的展品数量。 */
export function countUsage(fileID: string, exhibits: Exhibit[]): number {
  return usedByExhibits(fileID, exhibits).length
}
