// 展品分类的唯一来源：编辑表单下拉、列表筛选、类型注释共用此表，新增分类只改这里。
export const CATEGORIES = ['鱼类', '珊瑚', '哺乳类', '贝类', '藻类', '其他'] as const

export type Category = (typeof CATEGORIES)[number]
