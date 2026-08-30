// 生成展品小程序码：用小程序 AppID + AppSecret 自行换取 access_token，
// 再调 HTTP 接口 getwxacodeunlimit 生成码。
//
// 为什么不用 wx-server-sdk 的 cloud.openapi（免鉴权云调用）：
// 后台是网页（web_client）经 @cloudbase/js-sdk 调用本函数，带不进小程序身份，
// 免鉴权拿不到 access_token（报 INVALID_WX_ACCESS_TOKEN）。自管 token 与调用方无关，
// 网页调用也能生成。
//
// 环境变量（在云函数「环境变量」里配置）：
//   WX_APPID      小程序 AppID（可选，缺省用下方默认值）
//   WX_APPSECRET  小程序 AppSecret（必填，勿写进代码/前端）
//
// 前提：微信「开发管理 → 开发设置」中 access_token 的 IP 白名单**未启用**
// （云函数出口 IP 不固定，启用白名单会导致换 token 失败）。

const https = require('https')

const DEFAULT_APPID = 'wxb915f657bc03e253'
const EXHIBIT_PAGE = 'pages/exhibit/exhibit'

// getwxacodeunlimit 的 scene 限 32 字符，且仅支持这些字符
const SCENE_MAX = 32
const SCENE_ALLOWED = /^[0-9a-zA-Z!#$&'()*+,/:;=?@\-._~]+$/

function httpsRequest (options, bodyObj) {
  return new Promise((resolve, reject) => {
    // 显式序列化 body 并带上 Content-Length，避免默认 chunked 被微信接口拒绝而返回空 body
    const payload = bodyObj === undefined
      ? null
      : Buffer.from(typeof bodyObj === 'string' ? bodyObj : JSON.stringify(bodyObj), 'utf8')
    const headers = Object.assign({}, options.headers)
    if (payload) headers['Content-Length'] = payload.length

    const req = https.request(Object.assign({}, options, { headers }), (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks),
      }))
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

// 把响应体安全解析为 JSON；空/非 JSON 时抛出带状态码和内容片段的错误，便于定位
function parseJson (res, label) {
  const text = res.body.toString('utf8').trim()
  if (!text) {
    throw new Error(`${label}：微信返回空响应（HTTP ${res.statusCode}）。请确认云函数已联网、access_token IP 白名单已关闭。`)
  }
  try {
    return JSON.parse(text)
  } catch (e) {
    throw new Error(`${label}：微信返回非 JSON（HTTP ${res.statusCode}）：${text.slice(0, 200)}`)
  }
}

// 用 stable_token 换取 access_token（不会踢掉其它服务在用的 token）
async function getAccessToken (appid, secret) {
  const res = await httpsRequest({
    hostname: 'api.weixin.qq.com',
    path: '/cgi-bin/stable_token',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { grant_type: 'client_credential', appid, secret, force_refresh: false })

  const data = parseJson(res, '获取 access_token 失败')
  if (!data.access_token) {
    throw new Error(`获取 access_token 失败：errcode=${data.errcode} ${data.errmsg || ''}`)
  }
  return data.access_token
}

async function getWxaCode (token, { scene, page, envVersion }) {
  const res = await httpsRequest({
    hostname: 'api.weixin.qq.com',
    path: `/wxa/getwxacodeunlimit?access_token=${token}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, { scene, page, env_version: envVersion, check_path: false, width: 430 })

  const ct = res.headers['content-type'] || ''
  // 成功返回二进制图片；失败返回 JSON（首字节为 '{'）
  if (ct.includes('application/json') || res.body[0] === 0x7b) {
    const err = parseJson(res, '生成小程序码失败')
    throw new Error(`生成小程序码失败：errcode=${err.errcode} ${err.errmsg || ''}`)
  }
  if (!res.body || !res.body.length) {
    throw new Error(`生成小程序码失败：微信返回空响应（HTTP ${res.statusCode}）`)
  }
  return { contentType: ct || 'image/png', buffer: res.body }
}

/**
 * 入参 event：
 *   - exhibitId  必填，作为 scene，扫码后由展品页读取
 *   - envVersion 可选，'release'（默认）/ 'trial' / 'develop'
 * 返回：{ ok: true, contentType, base64 } 或 { ok: false, error }
 */
exports.main = async (event = {}) => {
  try {
    const scene = String(event.exhibitId || '').trim()
    if (!scene) throw new Error('缺少 exhibitId')
    if (scene.length > SCENE_MAX) throw new Error(`exhibitId 过长（scene 上限 ${SCENE_MAX} 字符）：${scene}`)
    if (!SCENE_ALLOWED.test(scene)) throw new Error(`exhibitId 含 scene 不支持的字符：${scene}`)

    const envVersion = ['release', 'trial', 'develop'].includes(event.envVersion)
      ? event.envVersion
      : 'release'

    const appid = process.env.WX_APPID || DEFAULT_APPID
    const secret = process.env.WX_APPSECRET
    if (!secret) throw new Error('云函数未配置 WX_APPSECRET 环境变量')

    const token = await getAccessToken(appid, secret)
    const { contentType, buffer } = await getWxaCode(token, { scene, page: EXHIBIT_PAGE, envVersion })

    return { ok: true, contentType, base64: buffer.toString('base64') }
  } catch (err) {
    return { ok: false, error: err.message || String(err) }
  }
}
