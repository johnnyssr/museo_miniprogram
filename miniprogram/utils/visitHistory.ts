const KEY = 'visited_exhibits'
const MS_KEY = 'visited_milestones'

// 打卡里程碑（百分比）：达成时给予反馈，100% 触发完成庆祝
export const MILESTONES = [25, 50, 75, 100]

export function markVisited(id: string): void {
  const list = getVisited()
  if (!list.includes(id)) {
    wx.setStorageSync(KEY, [...list, id])
  }
}

export function isVisited(id: string): boolean {
  return getVisited().includes(id)
}

export function getVisited(): string[] {
  try {
    return (wx.getStorageSync(KEY) as string[]) || []
  } catch {
    return []
  }
}

function getShownMilestones(): number[] {
  try {
    return (wx.getStorageSync(MS_KEY) as number[]) || []
  } catch {
    return []
  }
}

// 根据当前进度，返回「新达成且尚未庆祝过」的最高里程碑（无则 null）。
// 调用即记账：所有已达成的里程碑都会被标记为已庆祝，避免重复弹出。
export function takeNewMilestone(visitedCount: number, total: number): number | null {
  if (total <= 0) return null
  const pct = Math.floor((visitedCount / total) * 100)
  const shown = getShownMilestones()
  const reached = MILESTONES.filter((m) => pct >= m && !shown.includes(m))
  if (!reached.length) return null
  wx.setStorageSync(MS_KEY, [...shown, ...reached])
  return Math.max(...reached)
}
