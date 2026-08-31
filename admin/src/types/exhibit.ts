// 与 miniprogram/models/exhibit.ts 对齐；后台额外持有云数据库主键 _id
export interface Exhibit {
  _id?: string // 云数据库主键，编辑/删除时定位用
  exhibitId: string // 业务编号，二维码里编码的值（如 exhibit-001）
  name: string
  summary?: string // 简述（一句话概括，选填）
  image: string // cloud:// 或 https://
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
    image: '',
    text: '',
    audioUrl: '',
    videoUrl: '',
  }
}
