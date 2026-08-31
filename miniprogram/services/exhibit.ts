import { Exhibit } from '../models/exhibit'

// DB 文档结构：字段与 Exhibit 基本一致，但业务编号叫 exhibitId
interface ExhibitDoc {
  exhibitId: string
  name: string
  summary?: string
  category?: string
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
    category: doc.category,
    images,
    image: images[0] || '',
    text: doc.text,
    audioUrl: doc.audioUrl,
    videoUrl: doc.videoUrl,
  }
}

/**
 * 批量把 cloud:// fileID 换成可直接渲染的临时 https URL；非 cloud:// 原样保留。
 * <image>/<video>/音频 直接吃 cloud:// 不稳定，统一在此转换。getTempFileURL 单次上限 50。
 */
async function resolveCloudUrls(urls: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(urls.filter((u) => u && u.startsWith('cloud://')))]
  const map = new Map<string, string>()
  for (let i = 0; i < ids.length; i += 50) {
    const res = await wx.cloud.getTempFileURL({ fileList: ids.slice(i, i + 50) })
    for (const f of res.fileList) {
      if (f.tempFileURL) map.set(f.fileID, f.tempFileURL)
      else console.warn('[exhibit] getTempFileURL 失败', f.fileID, f.status, (f as { errmsg?: string }).errmsg)
    }
  }
  return map
}

const resolve = (u: string, map: Map<string, string>): string => map.get(u) || u

/** 把展品内的媒体地址（图集 + 音/视频）就地换成临时 URL。 */
async function resolveExhibitMedia(e: Exhibit): Promise<Exhibit> {
  const map = await resolveCloudUrls([...e.images, e.audioUrl, e.videoUrl])
  e.images = e.images.map((u) => resolve(u, map))
  e.image = e.images[0] || ''
  e.audioUrl = resolve(e.audioUrl, map)
  e.videoUrl = resolve(e.videoUrl, map)
  return e
}

/** 按业务编号查询单个展品，找不到返回 undefined */
export async function getExhibitById(id: string): Promise<Exhibit | undefined> {
  const res = await wx.cloud.callFunction({
    name: 'getExhibits',
    data: { exhibitId: id },
  })
  const doc = (res.result as { exhibit: ExhibitDoc | null }).exhibit
  return doc ? resolveExhibitMedia(toExhibit(doc)) : undefined
}

/** 返回全部展品 */
export async function getAllExhibits(): Promise<Exhibit[]> {
  const res = await wx.cloud.callFunction({
    name: 'getExhibits',
    data: {},
  })
  const list = ((res.result as { list: ExhibitDoc[] }).list || []).map(toExhibit)
  // 列表页只需封面缩略图；把各展品的图集统一批量转临时 URL
  const map = await resolveCloudUrls(list.flatMap((e) => e.images))
  for (const e of list) {
    e.images = e.images.map((u) => resolve(u, map))
    e.image = e.images[0] || ''
  }
  return list
}
