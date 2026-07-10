import { Exhibit } from '../models/exhibit'

// 说明（视频地址）：
// 小程序真机播放网络视频，需在 mp 后台「服务器域名 → downloadFile 合法域名」
// 里配置视频所在域名。下面用的是公开测试视频，国内访问未必稳定。
// 正式使用请替换成你自己的 mp4 直链（自建服务器 / 阿里云 OSS / 腾讯云 COS /
// 微信云存储），并把对应域名加进 downloadFile 白名单。
const EXHIBITS: Exhibit[] = [
  {
    id: 'exhibit-001',
    name: '青铜面具',
    dynasty: '商代',
    image: 'https://placehold.co/600x400?text=Bronze+Mask',
    text: '这件青铜面具铸造于商代晚期，采用范铸法制成，双目突出，造型威严，是祭祀礼器的代表，反映了当时高超的青铜冶铸工艺。',
    audioUrl: 'https://mp-cff48fa7-fc9f-45c3-b3fc-687e29e2cc0a.cdn.bspapp.com/simple/audio-sample.mp3',
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
  },
  {
    id: 'exhibit-002',
    name: '山水立轴',
    dynasty: '宋代',
    image: 'https://placehold.co/600x400?text=Landscape+Scroll',
    text: '这幅山水立轴以水墨勾勒层峦叠嶂，笔法细腻，意境深远，是宋代文人画的典型风格，体现了「可行、可望、可游、可居」的审美理想。',
    audioUrl: 'https://mp-cff48fa7-fc9f-45c3-b3fc-687e29e2cc0a.cdn.bspapp.com/simple/audio-sample.mp3',
    videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
  },
  {
    id: 'exhibit-003',
    name: '青花瓷瓶',
    dynasty: '明代',
    image: 'https://placehold.co/600x400?text=Blue+White+Vase',
    text: '这件青花瓷瓶烧制于明代永乐年间，胎质细腻，青花发色浓艳，纹饰繁密流畅，是景德镇官窑的精品，展现了明代制瓷业的巅峰水平。',
    audioUrl: 'https://mp-cff48fa7-fc9f-45c3-b3fc-687e29e2cc0a.cdn.bspapp.com/simple/audio-sample.mp3',
    videoUrl: 'https://media.w3.org/2010/05/sintel/trailer.mp4',
  },
]

/** 按 id 查询展品，找不到返回 undefined */
export function getExhibitById(id: string): Exhibit | undefined {
  return EXHIBITS.find(e => e.id === id)
}
