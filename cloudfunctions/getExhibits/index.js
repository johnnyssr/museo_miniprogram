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

  const res = await collection.limit(100).get()
  return { list: res.data }
}
