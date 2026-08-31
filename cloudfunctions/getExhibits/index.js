const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 入参 event.exhibitId：
 *  - 传了 → 返回 { exhibit } 单个（找不到则 exhibit 为 null）
 *  - 没传 → 返回 { list } 全部展品数组
 */
exports.main = async (event) => {
  const collection = db.collection('exhibits')

  if (event && event.exhibitId) {
    const res = await collection.where({ exhibitId: event.exhibitId }).get()
    return { exhibit: res.data.length > 0 ? res.data[0] : null }
  }

  // 云函数（admin SDK）单次上限 1000；后台的删除保护/文件名自动关联依赖完整展品列表，
  // 若沿用默认 100，超过 100 个展品后会漏判「媒体是否被引用」，导致误删。
  const res = await collection.limit(1000).get()
  return { list: res.data }
}
