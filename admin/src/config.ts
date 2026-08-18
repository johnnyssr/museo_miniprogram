// 云环境配置。这些值来自微信云开发 / CloudBase 控制台。
//
// env：现有小程序云环境 ID（与 miniprogram/app.ts 中一致）。
// region：CloudBase 环境所在地域，控制台「环境-环境信息」可查。
// accessKey：CloudBase Web SDK v2(V3 API) 所需的「凭证/publishable key」，
//            在控制台「环境-访问方式-Web」创建并配置允许的来源域名后获得。
//
// 部署时可用 Vite 环境变量覆盖（.env.local 里配置 VITE_CB_* 即可），
// 避免把 accessKey 硬编码进仓库。
export const CLOUD_ENV = import.meta.env.VITE_CB_ENV || 'cloud1-d6gnwyekz0f64654f'
export const CLOUD_REGION = import.meta.env.VITE_CB_REGION || 'ap-shanghai'
export const CLOUD_ACCESS_KEY = import.meta.env.VITE_CB_ACCESS_KEY || ''
