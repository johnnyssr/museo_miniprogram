// utils/shareCard.ts —— 生成「打卡卡片」并保存到相册（Canvas 2D）
// 需要页面提供一个 <canvas type="2d"> 节点；绘制海洋风打卡卡片后导出图片保存相册。
// 相册权限被拒时引导用户去设置开启。真机验证保存效果。

export interface CheckinCardData {
  brand: string // 站点/品牌名
  visited: number // 已打卡数量
  total: number // 展品总数
  highlight?: string // 可选：最近打卡的展品名
}

const CARD_W = 600
const CARD_H = 800

// 小程序环境无 DOM lib，Canvas 2D 上下文以 any 标注（运行时为标准 2D context）
type Ctx = any

function roundRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function draw(ctx: Ctx, data: CheckinCardData): void {
  const pct = data.total > 0 ? Math.round((data.visited / data.total) * 100) : 0

  // 背景海洋渐变
  const bg = ctx.createLinearGradient(0, 0, 0, CARD_H)
  bg.addColorStop(0, '#0e88ab')
  bg.addColorStop(1, '#0a6a86')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // 顶部品牌
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  ctx.font = '28px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('🌊 ' + data.brand, CARD_W / 2, 90)

  // 白色卡片
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, 60, 150, CARD_W - 120, CARD_H - 280, 32)
  ctx.fill()

  // 标题
  ctx.fillStyle = '#0d3a48'
  ctx.font = 'bold 44px sans-serif'
  ctx.fillText('我的海洋打卡', CARD_W / 2, 250)

  // 百分比大字
  ctx.fillStyle = '#0e88ab'
  ctx.font = 'bold 140px sans-serif'
  ctx.fillText(pct + '%', CARD_W / 2, 430)

  // 进度文案
  ctx.fillStyle = '#37535c'
  ctx.font = '32px sans-serif'
  ctx.fillText('已打卡 ' + data.visited + ' / ' + data.total + ' 件展品', CARD_W / 2, 500)

  // 进度条
  const barX = 110
  const barY = 540
  const barW = CARD_W - 220
  ctx.fillStyle = '#d5eef4'
  roundRect(ctx, barX, barY, barW, 20, 10)
  ctx.fill()
  ctx.fillStyle = '#f2a93c'
  roundRect(ctx, barX, barY, Math.max(20, (barW * pct) / 100), 20, 10)
  ctx.fill()

  // 最近打卡
  if (data.highlight) {
    ctx.fillStyle = '#6a8f9c'
    ctx.font = '26px sans-serif'
    ctx.fillText('最近打卡：' + data.highlight, CARD_W / 2, 610)
  }

  // 底部提示
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = '26px sans-serif'
  ctx.fillText(pct >= 100 ? '全部集齐，守护海洋生态！' : '扫码探索更多海洋生物', CARD_W / 2, CARD_H - 70)
}

function saveToAlbum(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => {
        wx.showToast({ title: '已保存到相册', icon: 'success' })
        resolve()
      },
      fail: (err) => {
        const msg = err.errMsg || ''
        if (/auth|deny|authorize|scope/i.test(msg)) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中允许保存到相册后重试',
            confirmText: '去设置',
            success: (r) => {
              if (r.confirm) wx.openSetting({})
            },
          })
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' })
        }
        reject(err)
      },
    })
  })
}

// 在给定的 canvas 2d 节点上绘制并保存。canvasNode 由页面通过 SelectorQuery 取得。
export function drawAndSaveCheckinCard(
  canvasNode: WechatMiniprogram.Canvas,
  data: CheckinCardData,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const dpr = (wx.getSystemInfoSync().pixelRatio || 2)
    const canvas = canvasNode as unknown as {
      width: number
      height: number
      getContext: (t: '2d') => Ctx
    }
    canvas.width = CARD_W * dpr
    canvas.height = CARD_H * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    draw(ctx, data)

    wx.canvasToTempFilePath({
      canvas: canvasNode,
      success: (res) => {
        saveToAlbum(res.tempFilePath).then(resolve).catch(reject)
      },
      fail: (err) => {
        wx.showToast({ title: '生成失败', icon: 'none' })
        reject(err)
      },
    })
  })
}
