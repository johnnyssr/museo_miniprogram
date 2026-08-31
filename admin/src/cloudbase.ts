import cloudbase from '@cloudbase/js-sdk'
import { CLOUD_ENV, CLOUD_REGION, CLOUD_ACCESS_KEY } from './config'
import type { Exhibit } from './types/exhibit'
import { exhibitImages } from './types/exhibit'
import { runBatch, type BatchResult } from './utils/batch'
import type { Media, MediaType } from './types/media'
import { inferMediaType } from './types/media'

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
  'exhibitId', 'name', 'summary', 'images', 'image', 'text', 'audioUrl', 'videoUrl',
]

// 只保留白名单字段，避免把 _id 等写回或写入意外字段
function pickFields(input: Partial<Exhibit>): Record<string, unknown> {
  const doc: Record<string, unknown> = {}
  for (const key of WRITABLE_FIELDS) {
    if (input[key] !== undefined) doc[key] = input[key]
  }
  // 图集归一化：以 images 为准，image 同步为封面（首张），兼容旧端 / 旧数据。
  if (doc.images !== undefined || doc.image !== undefined) {
    const images = exhibitImages({
      images: doc.images as string[] | undefined,
      image: doc.image as string | undefined,
    })
    doc.images = images
    doc.image = images[0] || ''
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

// ---- 媒体库（media 集合：资产元数据，与展品解耦）----
//
// 安全规则同 exhibits：{ read: true, write: "auth != null" }。
// media 集合需在云控制台手动创建（见实施计划前置事项）。

const MEDIA_COLLECTION = 'media'

/** 查询媒体库；可选按类型过滤，按上传时间倒序。 */
export async function fetchMedia(type?: MediaType): Promise<Media[]> {
  let query = db.collection(MEDIA_COLLECTION).orderBy('uploadedAt', 'desc')
  if (type) query = db.collection(MEDIA_COLLECTION).where({ type }).orderBy('uploadedAt', 'desc')
  const { data } = await query.limit(1000).get()
  return (data ?? []) as Media[]
}

/** 上传单个文件进库：先传云存储得 fileID，再写一条 media 记录。返回该记录。 */
export async function uploadMediaToLibrary(file: File): Promise<Media> {
  const type = inferMediaType(file.name)
  if (!type) throw new Error(`不支持的文件类型：${file.name}`)
  const fileID = await uploadMedia(file, type)
  const record: Media = { fileID, name: file.name, type, size: file.size, uploadedAt: Date.now() }
  const { id } = await db.collection(MEDIA_COLLECTION).add(record)
  return { ...record, _id: id as string }
}

/** 批量上传进库；单文件失败不影响整批，逐条计入 failed。 */
export async function uploadMediaBatch(
  files: File[],
  onProgress?: (d: number, t: number) => void,
): Promise<BatchResult<File>> {
  return runBatch(files, (f) => uploadMediaToLibrary(f).then(() => undefined), 3, onProgress)
}

/** 删除媒体记录；alsoDeleteFile 时一并删云存储文件（默认删）。 */
export async function deleteMedia(
  m: { _id?: string; fileID: string },
  alsoDeleteFile = true,
): Promise<void> {
  if (!m._id) throw new Error('缺少 media _id，无法删除')
  await db.collection(MEDIA_COLLECTION).doc(m._id).remove()
  if (alsoDeleteFile && m.fileID.startsWith('cloud://')) {
    await app.deleteFile({ fileList: [m.fileID] })
  }
}

/** 批量删除媒体。 */
export async function deleteMediaBatch(
  items: Media[],
  onProgress?: (d: number, t: number) => void,
): Promise<BatchResult<Media>> {
  return runBatch(items, (m) => deleteMedia({ _id: m._id, fileID: m.fileID }), 3, onProgress)
}

/** 更新媒体元数据（目前仅文件名）。文件名是「按文件名关联展品」的匹配钥匙。 */
export async function updateMedia(m: { _id?: string; name: string }): Promise<void> {
  if (!m._id) throw new Error('缺少 media _id，无法更新')
  await db.collection(MEDIA_COLLECTION).doc(m._id).update({ name: m.name })
}

/**
 * 把某媒体加入展品：图片追加进 images（去重），音/视频写入对应单值字段（会替换原值）。
 * exhibit 为内存中的展品对象，需含 _id。
 */
export async function attachMediaToExhibit(exhibit: Exhibit, fileID: string, type: MediaType): Promise<void> {
  if (type === 'image') {
    const images = exhibitImages(exhibit)
    if (images.includes(fileID)) return
    await updateExhibit({ _id: exhibit._id, images: [...images, fileID] } as unknown as Exhibit)
  } else {
    const field = type === 'audio' ? 'audioUrl' : 'videoUrl'
    await updateExhibit({ _id: exhibit._id, [field]: fileID } as unknown as Exhibit)
  }
}

/** 把某媒体从展品移除：图片从 images 删掉；音/视频仅当当前值等于该文件时清空。 */
export async function detachMediaFromExhibit(exhibit: Exhibit, fileID: string, type: MediaType): Promise<void> {
  if (type === 'image') {
    const images = exhibitImages(exhibit).filter((u) => u !== fileID)
    await updateExhibit({ _id: exhibit._id, images } as unknown as Exhibit)
  } else {
    const field = type === 'audio' ? 'audioUrl' : 'videoUrl'
    if ((exhibit[field] as string) !== fileID) return
    await updateExhibit({ _id: exhibit._id, [field]: '' } as unknown as Exhibit)
  }
}

/** 批量把多张图片一次性追加进某展品的图集（去重，单次写入避免并发覆盖）。 */
export async function appendImagesToExhibit(exhibit: Exhibit, fileIDs: string[]): Promise<void> {
  const existing = exhibitImages(exhibit)
  const additions = fileIDs.filter((id) => !existing.includes(id))
  if (!additions.length) return
  await updateExhibit({ _id: exhibit._id, images: [...existing, ...additions] } as unknown as Exhibit)
}
