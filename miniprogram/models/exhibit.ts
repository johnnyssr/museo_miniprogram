export interface Exhibit {
  id: string          // 页面/二维码使用的业务编号（由 service 层从 DB 的 exhibitId 映射而来）
  name: string        // 展品名称
  summary?: string    // 简述（一句话概括），可选
  category?: string   // 分类，如鱼类/珊瑚/哺乳类/贝类/藻类/其他
  images: string[]    // 图集，兼容 cloud:// 或 https://；第一张为封面
  image: string       // 封面（= images[0]），向后兼容
  text: string        // 文字介绍
  audioUrl: string    // 语音地址，兼容 cloud:// 或 https://
  videoUrl: string    // 视频地址，兼容 cloud:// 或 https://
}
