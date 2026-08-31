// 媒体库记录：与展品解耦，只存资产元数据。
// 展品字段仍存 fileID 引用，无需改展品结构。
export type MediaType = 'image' | 'video' | 'audio'

export interface Media {
  _id?: string // 云数据库主键
  fileID: string // cloud:// 存储地址，即展品字段中保存的引用值
  name: string // 原始文件名（如 exhibit-001.jpg）——自动匹配的钥匙
  type: MediaType // 由扩展名推断
  size: number // 字节数
  uploadedAt: number // 上传时间戳（写入时 Date.now()）
}

// 扩展名 → 类型；小写比对，无法识别返回 null
const EXT_MAP: Record<string, MediaType> = {
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image',
  mp4: 'video', mov: 'video', m4v: 'video',
  mp3: 'audio', m4a: 'audio', wav: 'audio', aac: 'audio',
}

/** 从文件名推断媒体类型；无扩展名或不认识返回 null。 */
export function inferMediaType(filename: string): MediaType | null {
  const dot = filename.lastIndexOf('.')
  if (dot < 0 || dot === filename.length - 1) return null
  const ext = filename.slice(dot + 1).toLowerCase()
  return EXT_MAP[ext] ?? null
}
