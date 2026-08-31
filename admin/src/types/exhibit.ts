// 与 miniprogram/models/exhibit.ts 对齐；后台额外持有云数据库主键 _id
export interface Exhibit {
  _id?: string // 云数据库主键，编辑/删除时定位用
  exhibitId: string // 业务编号，二维码里编码的值（如 exhibit-001）
  name: string
  summary?: string // 简述（一句话概括，选填）
  category?: string // 分类：鱼类/珊瑚/哺乳类/贝类/藻类/其他
  images?: string[] // 图集（cloud:// 或 https://），第一张为封面
  image: string // 封面（= images[0]）；向后兼容旧数据 / 未升级端
  text: string
  audioUrl: string // cloud:// 或 https://
  videoUrl: string // cloud:// 或 https://
}

// 新建时的空白展品
export function emptyExhibit(): Exhibit {
  return {
    exhibitId: '',
    name: '',
    summary: '',
    category: '',
    images: [],
    image: '',
    text: '',
    audioUrl: '',
    videoUrl: '',
  }
}

// 归一化图集：优先 images，回退旧的单 image；过滤空值。旧数据零迁移即可显示。
export function exhibitImages(e: { images?: string[]; image?: string }): string[] {
  const arr = e.images && e.images.length ? e.images : e.image ? [e.image] : []
  return arr.map((u) => (u || '').trim()).filter(Boolean)
}
