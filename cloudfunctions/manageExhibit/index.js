const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const COLLECTION = 'exhibits'

// 展品可写字段白名单（防止写入意外字段）
const FIELDS = ['exhibitId', 'name', 'dynasty', 'image', 'text', 'audioUrl', 'videoUrl']

function pickFields (input = {}) {
  const doc = {}
  for (const key of FIELDS) {
    if (input[key] !== undefined) doc[key] = input[key]
  }
  return doc
}

/**
 * 判断调用方是否为管理员。
 * 管理员白名单来自云函数环境变量 ADMIN_IDS（逗号分隔）。
 * CloudBase Web 端账号密码登录后调用，身份从 getWXContext 取；
 * 不同登录方式下标识字段可能不同，这里做多字段兜底，部署后用测试账号核对一次。
 */
function assertAdmin () {
  const ctx = cloud.getWXContext()
  const caller = ctx.OPENID || ctx.FROM_OPENID || ctx.UNIONID || ctx.UID
  const allow = (process.env.ADMIN_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  if (!caller || !allow.includes(caller)) {
    const err = new Error('无权限：仅管理员可执行写操作')
    err.code = 'NOT_ADMIN'
    err.caller = caller || null
    throw err
  }
}

async function create (data) {
  const doc = pickFields(data)
  if (!doc.exhibitId) throw new Error('exhibitId 必填')
  if (!doc.name) throw new Error('name 必填')

  const dup = await db.collection(COLLECTION).where({ exhibitId: doc.exhibitId }).count()
  if (dup.total > 0) throw new Error(`展品编号已存在：${doc.exhibitId}`)

  const res = await db.collection(COLLECTION).add({ data: doc })
  return { _id: res._id, ...doc }
}

async function update (data) {
  const doc = pickFields(data)
  const { _id } = data
  if (!_id && !doc.exhibitId) throw new Error('update 需要 _id 或 exhibitId 定位记录')

  const query = _id
    ? db.collection(COLLECTION).doc(_id)
    : db.collection(COLLECTION).where({ exhibitId: doc.exhibitId })

  const res = await query.update({ data: doc })
  return { updated: res.stats.updated }
}

async function remove (data) {
  const { _id, exhibitId } = data
  if (!_id && !exhibitId) throw new Error('delete 需要 _id 或 exhibitId 定位记录')

  const query = _id
    ? db.collection(COLLECTION).doc(_id)
    : db.collection(COLLECTION).where({ exhibitId })

  const res = await query.remove()
  return { removed: res.stats.removed }
}

/**
 * 入参 event.action：create / update / delete
 * event.data：展品字段（create/update）或定位信息（delete）
 * 返回统一结构：{ ok: true, data } 或 { ok: false, error }
 */
exports.main = async (event = {}) => {
  try {
    assertAdmin()

    const { action, data = {} } = event
    switch (action) {
      case 'create':
        return { ok: true, data: await create(data) }
      case 'update':
        return { ok: true, data: await update(data) }
      case 'delete':
        return { ok: true, data: await remove(data) }
      default:
        return { ok: false, error: `未知操作：${action}` }
    }
  } catch (err) {
    return { ok: false, error: err.message, code: err.code }
  }
}
