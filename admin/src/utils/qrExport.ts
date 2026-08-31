import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { fetchExhibitQRCode } from '../cloudbase'
import { runBatch } from './batch'
import type { Exhibit } from '../types/exhibit'

export interface QrItem { exhibit: Exhibit; dataUrl: string }

/** 逐个获取展品二维码（复用云函数），返回成功项与失败项 */
export async function collectQrCodes(
  items: Exhibit[],
  onProgress?: (d: number, t: number) => void,
): Promise<{ ok: QrItem[]; failed: { item: Exhibit; error: string }[] }> {
  const ok: QrItem[] = []
  const res = await runBatch(items, async (e) => {
    const dataUrl = await fetchExhibitQRCode(e.exhibitId)
    ok.push({ exhibit: e, dataUrl })
  }, 3, onProgress)
  return { ok, failed: res.failed }
}

/** 打包为 ZIP 下载，文件名 {exhibitId}.png */
export async function exportQrZip(items: QrItem[]): Promise<void> {
  const zip = new JSZip()
  for (const it of items) {
    const b64 = it.dataUrl.split(',')[1]
    zip.file(`${it.exhibit.exhibitId}.png`, b64, { base64: true })
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  saveAs(blob, `exhibit-qrcodes-${items.length}.zip`)
}

/** 生成可打印 HTML 并触发打印（新窗口） */
export function printQrSheet(items: QrItem[]): void {
  const cells = items.map(it => `
    <div class="cell">
      <img src="${it.dataUrl}" />
      <div class="id">${it.exhibit.exhibitId}</div>
      <div class="name">${it.exhibit.name}</div>
    </div>`).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>二维码标签</title>
    <style>
      body { font-family: sans-serif; }
      .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 16px; }
      .cell { border: 1px solid #c4e2ec; border-radius: 8px; padding: 10px; text-align: center; }
      .cell img { width: 120px; height: 120px; }
      .id { color: #0e88ab; font-weight: 600; margin-top: 6px; }
      .name { color: #0d3a48; font-size: 13px; }
      @media print { .cell { break-inside: avoid; } }
    </style></head>
    <body><div class="grid">${cells}</div>
    <script>window.onload = () => window.print()</script></body></html>`
  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}
