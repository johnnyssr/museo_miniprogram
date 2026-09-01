const KEY = 'visited_exhibits'

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
