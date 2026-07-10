import { Exhibit } from '../models/exhibit'

// 说明（媒体地址）：
// 小程序真机播放/加载网络媒体，需在 mp 后台「服务器域名」里配置对应域名。
// 当前使用的域名：
//   - 图片 image → mmbiz.qpic.cn（微信官方图床，国内快）→ 加到 downloadFile
//   - 音频 audioUrl → downsc.chinaz.net（站长素材公开 mp3）→ 加到 downloadFile
//   - 视频 videoUrl → www.chnmuseum.cn（中国国家博物馆官网）→ 加到 downloadFile
// 均为公开地址，正式使用建议替换成自己的资源（自建 / 阿里云 OSS / 腾讯云 COS /
// 微信云存储），并同步更新 downloadFile 白名单。
const IMG = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'
const AUDIO = 'https://downsc.chinaz.net/Files/DownLoad/sound1/201906/11582.mp3'
const VIDEO = 'https://www.chnmuseum.cn/masvod/public/2026/07/08/20260708_19f3f7e1000_r1.mp4'

const EXHIBITS: Exhibit[] = [
  {
    id: 'exhibit-001',
    name: '青铜面具',
    dynasty: '商代',
    image: IMG,
    text: '这件青铜面具铸造于商代晚期，采用范铸法制成，双目突出，造型威严，是祭祀礼器的代表，反映了当时高超的青铜冶铸工艺。',
    audioUrl: AUDIO,
    videoUrl: VIDEO,
  },
  {
    id: 'exhibit-002',
    name: '山水立轴',
    dynasty: '宋代',
    image: IMG,
    text: '这幅山水立轴以水墨勾勒层峦叠嶂，笔法细腻，意境深远，是宋代文人画的典型风格，体现了「可行、可望、可游、可居」的审美理想。',
    audioUrl: AUDIO,
    videoUrl: VIDEO,
  },
  {
    id: 'exhibit-003',
    name: '青花瓷瓶',
    dynasty: '明代',
    image: IMG,
    text: '这件青花瓷瓶烧制于明代永乐年间，胎质细腻，青花发色浓艳，纹饰繁密流畅，是景德镇官窑的精品，展现了明代制瓷业的巅峰水平。',
    audioUrl: AUDIO,
    videoUrl: VIDEO,
  },
]

/** 按 id 查询展品，找不到返回 undefined */
export function getExhibitById(id: string): Exhibit | undefined {
  return EXHIBITS.find(e => e.id === id)
}
