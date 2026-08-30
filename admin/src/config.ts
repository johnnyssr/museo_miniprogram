// 云环境配置。这些值来自微信云开发 / CloudBase 控制台。
//
// env：现有小程序云环境 ID（与 miniprogram/app.ts 中一致）。
// region：CloudBase 环境所在地域，控制台「环境-环境信息」可查。
// accessKey：@cloudbase/js-sdk 2.x 初始化并不需要它（init 只要 env+region，
//            见控制台「身份认证 → 快速开始」示例）。此处保留为可选：留空即不传。
//
// 部署时可用 Vite 环境变量覆盖（.env.local 里配置 VITE_CB_* 即可）。
export const CLOUD_ENV = import.meta.env.VITE_CB_ENV || 'cloud1-d9g0ig4ad8e90ecde'
export const CLOUD_REGION = import.meta.env.VITE_CB_REGION || 'ap-shanghai'
export const CLOUD_ACCESS_KEY = import.meta.env.VITE_CB_ACCESS_KEY || ''
