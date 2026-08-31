import { Exhibit } from '../models/exhibit'

// DB 文档结构：字段与 Exhibit 基本一致，但业务编号叫 exhibitId
interface ExhibitDoc {
  exhibitId: string
  name: string
  summary?: string
  images?: string[]
  image?: string
  text: string
  audioUrl: string
  videoUrl: string
}

/** 把 DB 文档映射为页面用的 Exhibit（exhibitId → id） */
function toExhibit(doc: ExhibitDoc): Exhibit {
  // 归一化图集：优先 images，回退旧的单 image；过滤空值。旧数据零迁移即可显示。
  const raw = doc.images && doc.images.length ? doc.images : doc.image ? [doc.image] : []
  const images = raw.map((u) => (u || '').trim()).filter(Boolean)
  return {
    id: doc.exhibitId,
    name: doc.name,
    summary: doc.summary,
    images,
    image: images[0] || '',
    text: doc.text,
    audioUrl: doc.audioUrl,
    videoUrl: doc.videoUrl,
  }
}

/** 按业务编号查询单个展品，找不到返回 undefined */
export async function getExhibitById(id: string): Promise<Exhibit | undefined> {
  const res = await wx.cloud.callFunction({
    name: 'getExhibits',
    data: { exhibitId: id },
  })
  const doc = (res.result as { exhibit: ExhibitDoc | null }).exhibit
  return doc ? toExhibit(doc) : undefined
}

/** 返回全部展品 */
export async function getAllExhibits(): Promise<Exhibit[]> {
  const res = await wx.cloud.callFunction({
    name: 'getExhibits',
    data: {},
  })
  const list = (res.result as { list: ExhibitDoc[] }).list || []
  return list.map(toExhibit)
}
