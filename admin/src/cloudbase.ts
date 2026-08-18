import cloudbase from '@cloudbase/js-sdk'
import { CLOUD_ENV, CLOUD_REGION, CLOUD_ACCESS_KEY } from './config'
import type { Exhibit } from './types/exhibit'

// 全部 CloudBase 细节收敛在此文件，页面只依赖这里导出的函数，
// 便于将来切换登录方式 / SDK 版本时集中修改。

const app = cloudbase.init({
  env: CLOUD_ENV,
  region: CLOUD_REGION,
  ...(CLOUD_ACCESS_KEY ? { accessKey: CLOUD_ACCESS_KEY } : {}),
})

const auth = app.auth

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

// ---- 展品写（走带鉴权的云函数 manageExhibit）----

type ManageResult = { ok: boolean; data?: unknown; error?: string }

async function manage(action: 'create' | 'update' | 'delete', data: Partial<Exhibit>): Promise<ManageResult> {
  const { result } = await app.callFunction({ name: 'manageExhibit', data: { action, data } })
  const res = result as ManageResult
  if (!res?.ok) throw new Error(res?.error || '操作失败')
  return res
}

export const createExhibit = (data: Exhibit) => manage('create', data)
export const updateExhibit = (data: Exhibit) => manage('update', data)
export const deleteExhibit = (locator: { _id?: string; exhibitId?: string }) => manage('delete', locator)

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
