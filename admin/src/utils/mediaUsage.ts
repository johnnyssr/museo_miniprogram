import type { Exhibit } from '../types/exhibit'

// 展品里可能引用媒体的三个字段
const REF_FIELDS: (keyof Exhibit)[] = ['image', 'audioUrl', 'videoUrl']

/** 返回引用了该 fileID 的展品列表（任意字段命中即算）。 */
export function usedByExhibits(fileID: string, exhibits: Exhibit[]): Exhibit[] {
  if (!fileID) return []
  return exhibits.filter((e) => REF_FIELDS.some((f) => e[f] === fileID))
}

/** 引用该 fileID 的展品数量。 */
export function countUsage(fileID: string, exhibits: Exhibit[]): number {
  return usedByExhibits(fileID, exhibits).length
}
