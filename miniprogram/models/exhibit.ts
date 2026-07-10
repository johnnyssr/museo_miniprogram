export interface Exhibit {
  id: string          // 展品唯一标识，二维码里编码的就是它
  name: string        // 展品名称
  dynasty?: string    // 年代（如「唐代」），可选
  image: string       // 展品图片 URL
  text: string        // 文字介绍
  audioUrl: string    // 语音介绍 URL
  videoUrl: string    // 视频介绍 URL
}
