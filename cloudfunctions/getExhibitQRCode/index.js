const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// 展品详情页路径（scene 携带 exhibitId，页面 onLoad 读 query.scene）
const EXHIBIT_PAGE = 'pages/exhibit/exhibit'

// getUnlimited 的 scene 限 32 字符，且仅支持这些字符
const SCENE_MAX = 32
const SCENE_ALLOWED = /^[0-9a-zA-Z!#$&'()*+,/:;=?@\-._~]+$/

/**
 * 生成某个展品的小程序码（数量不限，扫码进入展品详情页）。
 *
 * 入参 event：
 *   - exhibitId  必填，作为 scene，扫码后由展品页读取
 *   - envVersion 可选，'release'（默认，正式版）/ 'trial'（体验版）/ 'develop'（开发版）
 *                正式发布前用 trial/develop 自测（仅体验成员/开发者可扫）
 *
 * 返回：{ ok: true, contentType, base64 } 或 { ok: false, error }
 *
 * 说明：小程序码由微信 openapi 生成，需云函数所属小程序对应版本存在目标页面。
 * checkPath=false 允许在未发布时也能生成图片；但 release 版扫码生效仍需正式发布。
 */
exports.main = async (event = {}) => {
  try {
    const scene = String(event.exhibitId || '').trim()
    if (!scene) throw new Error('缺少 exhibitId')
    if (scene.length > SCENE_MAX) throw new Error(`exhibitId 过长（小程序码 scene 上限 ${SCENE_MAX} 字符）：${scene}`)
    if (!SCENE_ALLOWED.test(scene)) throw new Error(`exhibitId 含小程序码 scene 不支持的字符：${scene}`)

    const envVersion = ['release', 'trial', 'develop'].includes(event.envVersion)
      ? event.envVersion
      : 'release'

    const res = await cloud.openapi.wxacode.getUnlimited({
      scene,
      page: EXHIBIT_PAGE,
      envVersion,
      checkPath: false, // 未发布时也能生成
      width: 430,
    })

    if (res.errCode && res.errCode !== 0) {
      throw new Error(`微信生成小程序码失败：errCode=${res.errCode} ${res.errMsg || ''}`)
    }

    return {
      ok: true,
      contentType: res.contentType || 'image/png',
      base64: Buffer.from(res.buffer).toString('base64'),
    }
  } catch (err) {
    return { ok: false, error: err.message || String(err) }
  }
}
