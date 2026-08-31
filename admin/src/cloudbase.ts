import cloudbase from '@cloudbase/js-sdk'
import { CLOUD_ENV, CLOUD_REGION, CLOUD_ACCESS_KEY } from './config'
import type { Exhibit } from './types/exhibit'
import { runBatch, type BatchResult } from './utils/batch'

// 全部 CloudBase 细节收敛在此文件，页面只依赖这里导出的函数，
// 便于将来切换登录方式 / SDK 版本时集中修改。

const app = cloudbase.init({
  env: CLOUD_ENV,
  region: CLOUD_REGION,
  ...(CLOUD_ACCESS_KEY ? { accessKey: CLOUD_ACCESS_KEY } : {}),
})

const auth = app.auth
const db = app.database()

// ---- 认证 ----

/** 账号密码登录。失败时抛出带中文提示的错误。 */
export async function login(username: string, password: string): Promise<void> {
  const { error } = await auth.signInWithPassword({ username, password })
  if (error) throw new Error(error.message || '登录失败，请检查账号密码')
}

export async function logout(): Promise<void> {
  await auth.signOut()
}

/** 已登录返回用户 id，未登录返回 null。 */
export async function currentUserId(): Promise<string | null> {
  const { data, error } = await auth.getUser()
  if (error || !data?.user) return null
  return data.user.id ?? null
}

// ---- 展品读（复用现有只读云函数 getExhibits）----

export async function fetchExhibits(): Promise<Exhibit[]> {
  const { result } = await app.callFunction({ name: 'getExhibits', data: {} })
  return (result?.list ?? []) as Exhibit[]
}

// ---- 展品小程序码（云函数 getExhibitQRCode → wxacode.getUnlimited）----

export type QRCodeEnvVersion = 'release' | 'trial' | 'develop'

/**
 * 取某展品的小程序码，返回可直接用于 <img src> / 下载的 data URL。
 * envVersion：release 正式版（默认）/ trial 体验版 / develop 开发版（发布前自测用）。
 */
export async function fetchExhibitQRCode(
  exhibitId: string,
  envVersion: QRCodeEnvVersion = 'release',
): Promise<string> {
  const { result } = await app.callFunction({
    name: 'getExhibitQRCode',
    data: { exhibitId, envVersion },
  })
  const res = result as { ok?: boolean; error?: string; contentType?: string; base64?: string }
  if (!res?.ok || !res.base64) {
    throw new Error(res?.error || '生成小程序码失败')
  }
  return `data:${res.contentType || 'image/png'};base64,${res.base64}`
}

// ---- 展品写（SDK 直连数据库；鉴权由 CloudBase 数据库安全规则把关）----
//
// 安全模型：exhibits 集合安全规则设为「读:所有人 / 写:仅登录用户」。
// 未登录调用会被 CloudBase 直接拒绝，无需应用层口令；每个维护者用自己的账号登录。

const COLLECTION = 'exhibits'
const WRITABLE_FIELDS: (keyof Exhibit)[] = [
  'exhibitId', 'name', 'dynasty', 'image', 'text', 'audioUrl', 'videoUrl',
]

// 只保留白名单字段，避免把 _id 等写回或写入意外字段
function pickFields(input: Partial<Exhibit>): Record<string, unknown> {
  const doc: Record<string, unknown> = {}
  for (const key of WRITABLE_FIELDS) {
    if (input[key] !== undefined) doc[key] = input[key]
  }
  return doc
}

export async function createExhibit(data: Exhibit): Promise<void> {
  const doc = pickFields(data)
  if (!doc.exhibitId) throw new Error('展品编号必填')
  if (!doc.name) throw new Error('名称必填')

  const dup = await db.collection(COLLECTION).where({ exhibitId: doc.exhibitId }).count()
  if (((dup as { total?: number }).total ?? 0) > 0) {
    throw new Error(`展品编号已存在：${doc.exhibitId}`)
  }
  await db.collection(COLLECTION).add(doc)
}

export async function updateExhibit(data: Exhibit): Promise<void> {
  if (!data._id) throw new Error('缺少记录 _id，无法更新')
  await db.collection(COLLECTION).doc(data._id).update(pickFields(data))
}

export async function deleteExhibit(locator: { _id?: string; exhibitId?: string }): Promise<void> {
  if (locator._id) {
    await db.collection(COLLECTION).doc(locator._id).remove()
  } else if (locator.exhibitId) {
    await db.collection(COLLECTION).where({ exhibitId: locator.exhibitId }).remove()
  } else {
    throw new Error('缺少 _id 或 exhibitId，无法删除')
  }
}

export async function deleteExhibitsBatch(
  items: Exhibit[],
  onProgress?: (d: number, t: number) => void,
): Promise<BatchResult<Exhibit>> {
  return runBatch(items, (e) => deleteExhibit({ _id: e._id, exhibitId: e.exhibitId }), 5, onProgress)
}

export async function createExhibitsBatch(
  rows: Partial<Exhibit>[],
  onProgress?: (d: number, t: number) => void,
): Promise<BatchResult<Partial<Exhibit>>> {
  return runBatch(rows, (r) => createExhibit(r as Exhibit).then(() => undefined), 5, onProgress)
}

// ---- 云存储 ----

/** 上传浏览器 File 到云存储，返回 cloud:// fileID。 */
export async function uploadMedia(file: File, kind: 'image' | 'audio' | 'video'): Promise<string> {
  // cloudPath 需唯一，避免覆盖：kind/时间戳-原名
  const cloudPath = `exhibits/${kind}/${Date.now()}-${file.name}`
  // Web 端 filePath 实际接收 File 对象；SDK 类型声明为 string（与 node 端共用），此处按运行时约定传入。
  const { fileID } = await app.uploadFile({ cloudPath, filePath: file as unknown as string })
  return fileID
}

/** 把 cloud:// fileID 换成可预览的临时 https URL；传入非 cloud:// 原样返回。 */
export async function toPreviewUrl(url: string): Promise<string> {
  if (!url || !url.startsWith('cloud://')) return url
  const { fileList } = await app.getTempFileURL({ fileList: [url] })
  return fileList?.[0]?.tempFileURL || ''
}
