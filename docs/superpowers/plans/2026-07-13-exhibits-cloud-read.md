# 展品数据上云（第一阶段：只做读通路）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把展品数据从小程序本地 mock 迁到微信云开发：数据存云数据库，小程序通过云函数 `getExhibits` 读取；页面渲染逻辑不变。

**Architecture:** 云数据库集合 `exhibits` 存展品；云函数 `getExhibits`（传 exhibitId 查单个、不传查全部）；小程序 `app.ts` 初始化云开发，`services/exhibit.ts` 改为异步调云函数并把 DB 的 `exhibitId` 映射为页面用的 `id`，详情页/列表页 `onLoad` 改为异步。

**Tech Stack:** 微信云开发（云数据库 + 云函数，Node.js `wx-server-sdk`）、小程序 TypeScript、`wx.cloud.callFunction`。

**说明：** 无自动化测试框架，用「手动/静态验证步骤」代替。每个 task 末尾提交。

**关于 `Exhibit.id` 与 DB `exhibitId`：** 页面和 wxml 现在全用 `Exhibit.id`（如 `item.id`、`?id=`）。为保持页面零改动，DB 里字段叫 `exhibitId`，**service 层读到数据后映射成 `id`** 返回给页面。这样 wxml、样式、详情页读取 `query.id` 全部不用动。

**关于 envId：** `app.ts` 需要填云开发环境 ID。计划中用占位符 `<YOUR_ENV_ID>`，实现时替换为用户提供的真实 envId（用户在开发者工具开通云开发后获取）。

---

### Task 1: 云开发项目配置与初始化

**Files:**
- Modify: `project.config.json`
- Modify: `miniprogram/app.ts`

- [ ] **Step 1: 在 project.config.json 声明云函数根目录**

`project.config.json` 顶层（与 `miniprogramRoot` 同级）新增一行 `cloudfunctionRoot`，指向 `cloudfunctions/`。当前该文件顶部为：

```json
{
  "description": "项目配置文件",
  "miniprogramRoot": "miniprogram/",
  "compileType": "miniprogram",
```

改为：

```json
{
  "description": "项目配置文件",
  "miniprogramRoot": "miniprogram/",
  "cloudfunctionRoot": "cloudfunctions/",
  "compileType": "miniprogram",
```

- [ ] **Step 2: app.ts 初始化云开发**

`miniprogram/app.ts` 当前内容：

```ts
// app.ts
App<IAppOption>({
  globalData: {},
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        console.log(res.code)
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      },
    })
  },
})
```

整体替换为（在 onLaunch 开头加云开发初始化）：

```ts
// app.ts
App<IAppOption>({
  globalData: {},
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('当前基础库版本过低，无法使用云能力')
    } else {
      wx.cloud.init({
        env: '<YOUR_ENV_ID>',
        traceUser: true,
      })
    }

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        console.log(res.code)
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      },
    })
  },
})
```

> 实现时把 `<YOUR_ENV_ID>` 替换成用户提供的真实 envId。

- [ ] **Step 3: 静态验证**

确认：`project.config.json` 是合法 JSON 且含 `cloudfunctionRoot`；`app.ts` 中 `wx.cloud.init` 在 onLaunch 内、env 已填（或留占位待替换）；未破坏原有 login/logs 逻辑。

- [ ] **Step 4: Commit**

```bash
git add project.config.json miniprogram/app.ts
git commit -m "chore: enable wx cloud and init cloud env"
```

---

### Task 2: 云函数 getExhibits

**Files:**
- Create: `cloudfunctions/getExhibits/index.js`
- Create: `cloudfunctions/getExhibits/package.json`

- [ ] **Step 1: 创建 package.json**

写入 `cloudfunctions/getExhibits/package.json`：

```json
{
  "name": "getExhibits",
  "version": "1.0.0",
  "description": "查询展品：传 exhibitId 返回单个，不传返回全部",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: 创建 index.js**

写入 `cloudfunctions/getExhibits/index.js`：

```js
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
```

- [ ] **Step 3: 静态验证**

确认：`index.js` 导出 `main`；查询集合名为 `exhibits`；传 exhibitId 用 `.where({ exhibitId })` 查单个、不传用 `.get()` 查全部；package.json 合法 JSON 且依赖 wx-server-sdk。

- [ ] **Step 4: 部署云函数（用户在开发者工具操作）**

在微信开发者工具中，右键 `cloudfunctions/getExhibits` → 「上传并部署：云端安装依赖」。等待部署成功。
（此步依赖已开通云开发 + 已填 envId。若尚未开通，先完成 Task 1 的 envId 替换与云开发开通。）

- [ ] **Step 5: Commit**

```bash
git add cloudfunctions/getExhibits/
git commit -m "feat: add getExhibits cloud function"
```

---

### Task 3: Exhibit 类型加 exhibitId

**Files:**
- Modify: `miniprogram/models/exhibit.ts`

- [ ] **Step 1: 给接口加 exhibitId 字段**

`miniprogram/models/exhibit.ts` 当前：

```ts
export interface Exhibit {
  id: string          // 展品唯一标识，二维码里编码的就是它
  name: string        // 展品名称
  dynasty?: string    // 年代（如「唐代」），可选
  image: string       // 展品图片 URL
  text: string        // 文字介绍
  audioUrl: string    // 语音介绍 URL
  videoUrl: string    // 视频介绍 URL
}
```

整体替换为：

```ts
export interface Exhibit {
  id: string          // 页面/二维码使用的业务编号（由 service 层从 DB 的 exhibitId 映射而来）
  name: string        // 展品名称
  dynasty?: string    // 年代（如「唐代」），可选
  image: string       // 展品图片地址，兼容 cloud:// 或 https://
  text: string        // 文字介绍
  audioUrl: string    // 语音地址，兼容 cloud:// 或 https://
  videoUrl: string    // 视频地址，兼容 cloud:// 或 https://
}
```

> 说明：DB 文档字段叫 `exhibitId`，service 层会映射为页面用的 `id`（见 Task 4）。故接口对页面暴露的仍是 `id`，页面代码零改动。

- [ ] **Step 2: 静态验证**

确认接口仍导出 `Exhibit`，字段名 `id/name/dynasty/image/text/audioUrl/videoUrl` 不变（页面依赖这些名字）。

- [ ] **Step 3: Commit**

```bash
git add miniprogram/models/exhibit.ts
git commit -m "docs: clarify Exhibit fields for cloud media compatibility"
```

---

### Task 4: service 层改为异步调云函数

**Files:**
- Modify: `miniprogram/services/exhibit.ts`（整体替换）

- [ ] **Step 1: 整体替换 services/exhibit.ts**

整体替换 `miniprogram/services/exhibit.ts` 为：

```ts
import { Exhibit } from '../models/exhibit'

// DB 文档结构：字段与 Exhibit 基本一致，但业务编号叫 exhibitId
interface ExhibitDoc {
  exhibitId: string
  name: string
  dynasty?: string
  image: string
  text: string
  audioUrl: string
  videoUrl: string
}

/** 把 DB 文档映射为页面用的 Exhibit（exhibitId → id） */
function toExhibit(doc: ExhibitDoc): Exhibit {
  return {
    id: doc.exhibitId,
    name: doc.name,
    dynasty: doc.dynasty,
    image: doc.image,
    text: doc.text,
    audioUrl: doc.audioUrl,
    videoUrl: doc.videoUrl,
  }
}

/** 按业务编号查询单个展品，找不到返回 undefined */
export async function getExhibitById(id: string): Promise<Exhibit | undefined> {
  const res = await wx.cloud.callFunction({
    name: 'getExhibits',
    data: { exhibitId: id },
  })
  const doc = (res.result as { exhibit: ExhibitDoc | null }).exhibit
  return doc ? toExhibit(doc) : undefined
}

/** 返回全部展品 */
export async function getAllExhibits(): Promise<Exhibit[]> {
  const res = await wx.cloud.callFunction({
    name: 'getExhibits',
    data: {},
  })
  const list = (res.result as { list: ExhibitDoc[] }).list || []
  return list.map(toExhibit)
}
```

- [ ] **Step 2: 静态验证**

确认：两个函数均返回 Promise；`getExhibitById` 传 `{ exhibitId: id }`、`getAllExhibits` 传 `{}`；`toExhibit` 把 `exhibitId` 映射为 `id`；云函数名 `getExhibits` 与 Task 2 一致；不再引用本地 EXHIBITS 数组。

- [ ] **Step 3: Commit**

```bash
git add miniprogram/services/exhibit.ts
git commit -m "feat: read exhibits from cloud function instead of local mock"
```

---

### Task 5: 详情页适配异步 + loading/错误处理

**Files:**
- Modify: `miniprogram/pages/exhibit/exhibit.ts`

- [ ] **Step 1: 把 onLoad 改为异步并加 loading/错误处理**

`miniprogram/pages/exhibit/exhibit.ts` 当前 `onLoad` 为：

```ts
    onLoad(query: Record<string, string>) {
      const id = (query.id || '').trim()
      const exhibit = getExhibitById(id)
      if (!exhibit) {
        this.setData({ notFound: true })
        return
      }
      this.setData({ exhibit })
    },
```

整体替换该 `onLoad` 方法为：

```ts
    async onLoad(query: Record<string, string>) {
      const id = (query.id || '').trim()
      wx.showLoading({ title: '加载中' })
      try {
        const exhibit = await getExhibitById(id)
        if (!exhibit) {
          this.setData({ notFound: true })
          return
        }
        this.setData({ exhibit })
      } catch (e) {
        wx.showToast({ title: '加载失败，请重试', icon: 'none' })
      } finally {
        wx.hideLoading()
      }
    },
```

> 其余方法（toggleAudio / toggleAudioPlay / toggleVideo / onVideoError / detached）与 import 均不改。`getExhibitById` 现在返回 Promise，故用 `await`。

- [ ] **Step 2: 静态验证**

确认：`onLoad` 为 `async`；`await getExhibitById(id)`；try/catch/finally 中 loading 关闭、失败 toast；`notFound`/`exhibit` setData 逻辑与原一致。

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/exhibit/exhibit.ts
git commit -m "feat: make exhibit detail load async with loading and error handling"
```

---

### Task 6: 列表页适配异步 + loading/错误处理

**Files:**
- Modify: `miniprogram/pages/list/list.ts`

- [ ] **Step 1: 把 onLoad 改为异步并加 loading/错误处理**

`miniprogram/pages/list/list.ts` 当前 `onLoad` 为：

```ts
    onLoad() {
      this.setData({ list: getAllExhibits() })
    },
```

整体替换该 `onLoad` 方法为：

```ts
    async onLoad() {
      wx.showLoading({ title: '加载中' })
      try {
        const list = await getAllExhibits()
        this.setData({ list })
      } catch (e) {
        wx.showToast({ title: '加载失败，请重试', icon: 'none' })
      } finally {
        wx.hideLoading()
      }
    },
```

> `onTapExhibit` 方法与 import 不改。`getAllExhibits` 现在返回 Promise，故用 `await`。空数组时 wxml 已有「暂无展品」空状态。

- [ ] **Step 2: 静态验证**

确认：`onLoad` 为 `async`；`await getAllExhibits()`；try/catch/finally 中 loading 关闭、失败 toast；`list` setData 逻辑保留。

- [ ] **Step 3: Commit**

```bash
git add miniprogram/pages/list/list.ts
git commit -m "feat: make exhibit list load async with loading and error handling"
```

---

### Task 7: 录入初始数据并端到端手动验证

**Files:**（无代码文件；产出一份录入清单，验证整链路）
- Create: `docs/superpowers/exhibits-seed-data.md`（供用户在控制台手动录入的清单）

- [ ] **Step 1: 生成录入清单**

写入 `docs/superpowers/exhibits-seed-data.md`，内容为 3 条待录入文档（供用户在云开发控制台 `exhibits` 集合手动新增）：

```json
{
  "exhibitId": "exhibit-001",
  "name": "青铜面具",
  "dynasty": "商代",
  "image": "https://mmbiz.qpic.cn/mmbiz_jpg/4dXPpQ8ib8CfRpLMicRlibp1cDVdwDG7eXYkpGsCLILIQE8K2K5XZQHaSG11xwl7831JSkgnmz1AxiaghdMsjsWflw/640?wx_fmt=jpeg",
  "text": "这件青铜面具铸造于商代晚期，采用范铸法制成，双目突出，造型威严，是祭祀礼器的代表，反映了当时高超的青铜冶铸工艺。",
  "audioUrl": "https://downsc.chinaz.net/Files/DownLoad/sound1/201906/11582.mp3",
  "videoUrl": "https://www.chnmuseum.cn/masvod/public/2026/07/08/20260708_19f3f7e1000_r1.mp4"
}
```
```json
{
  "exhibitId": "exhibit-002",
  "name": "山水立轴",
  "dynasty": "宋代",
  "image": "https://mmbiz.qpic.cn/mmbiz_jpg/4dXPpQ8ib8CfRpLMicRlibp1cDVdwDG7eXYawftibfSj8RFJFsWeQEPaH9Jh37tdPOfG3zEjkfW5icg4Bgfw6eRMp3w/640?wx_fmt=jpeg",
  "text": "这幅山水立轴以水墨勾勒层峦叠嶂，笔法细腻，意境深远，是宋代文人画的典型风格，体现了「可行、可望、可游、可居」的审美理想。",
  "audioUrl": "https://downsc.chinaz.net/Files/DownLoad/sound1/201906/11582.mp3",
  "videoUrl": "https://www.chnmuseum.cn/masvod/public/2026/07/08/20260708_19f3f7e1000_r1.mp4"
}
```
```json
{
  "exhibitId": "exhibit-003",
  "name": "青花瓷瓶",
  "dynasty": "明代",
  "image": "https://mmbiz.qpic.cn/mmbiz_jpg/4dXPpQ8ib8CfRpLMicRlibp1cDVdwDG7eXYIicib4lFqsBzWFcvRiaqXdCIIKRpPfdIbiatIx6gWw7ajkOS4eqnzXcDEQ/640?wx_fmt=jpeg&from=appmsg",
  "text": "这件青花瓷瓶烧制于明代永乐年间，胎质细腻，青花发色浓艳，纹饰繁密流畅，是景德镇官窑的精品，展现了明代制瓷业的巅峰水平。",
  "audioUrl": "https://downsc.chinaz.net/Files/DownLoad/sound1/201906/11582.mp3",
  "videoUrl": "https://www.chnmuseum.cn/masvod/public/2026/07/08/20260708_19f3f7e1000_r1.mp4"
}
```

在清单文件顶部加一句操作说明：「在微信开发者工具『云开发控制台 → 数据库 → 新建集合 exhibits（权限选：仅创建者可读写 或 所有用户可读，展品为公开数据建议后者）→ 逐条新增以上记录』」。

- [ ] **Step 2: 用户操作 —— 建集合、录数据**

用户在云开发控制台：新建集合 `exhibits`，权限设为「所有用户可读，仅管理端可写」（读的是公开数据）；按清单录入 3 条记录。

- [ ] **Step 3: 端到端手动验证**

开发者工具编译后：
1. 云开发控制台确认 `exhibits` 有 3 条数据。
2. 列表页 `onLoad` → 显示「加载中」→ 拉到 3 张卡片。
3. 点卡片（或首页扫一扫输入 `exhibit-001`）→ 详情页显示对应展品，图文/音/视频正常。
4. 详情页输入不存在的 id（如 `bad-id`）→ 显示「未找到该展品」。
5. 把 `app.ts` 的 env 临时改错 → 页面 toast「加载失败，请重试」、不崩溃；改回正确 env 恢复。

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/exhibits-seed-data.md
git commit -m "docs: add exhibits seed data for cloud database"
```

---

## Self-Review

**Spec coverage：**
- 数据模型集合 `exhibits`、字段含 `exhibitId`、媒体兼容 cloud://和https:// → Task 3（接口注释）+ Task 7（录入数据用 http 外链）✅
- exhibitId 与 _id 解耦、查询按 exhibitId → Task 2 云函数 `.where({exhibitId})` + Task 4 service 映射 ✅
- 云函数 getExhibits（传 exhibitId 查单个 / 不传查全部）→ Task 2 ✅
- app.ts 初始化云开发 → Task 1 ✅
- service 改异步调云函数、删本地数组 → Task 4 ✅
- 详情页/列表页 onLoad 异步化 → Task 5 / Task 6 ✅
- 错误处理（调用失败 toast、查无空状态、列表空状态、loading）→ Task 5/6 try-catch-finally + 现有空状态 ✅
- 初始 3 条手动录入 → Task 7 ✅
- 预留 exhibitId 启动参数（小程序码稍后实现）→ id 即 exhibitId，详情页已读 query.id，无需额外改动 ✅
- envId 由用户提供 → Task 1 占位符说明 ✅

**Placeholder scan：** 仅 `<YOUR_ENV_ID>` 为有意占位（spec 明确由用户提供），已在 header 和 Task 1 标注替换方式。其余步骤均含完整代码/命令，无 TODO/TBD。

**Type consistency：**
- 云函数返回 `{ exhibit }`（单个）/ `{ list }`（全部）→ Task 4 service 分别按 `.exhibit` / `.list` 解析，一致。
- DB 字段 `exhibitId` → service `toExhibit` 映射为 `id` → 页面用 `id`/`item.id`/`query.id`，全链路一致。
- 云函数名 `getExhibits` 在 Task 2 定义、Task 4 调用一致。
- `getExhibitById` 返回 `Promise<Exhibit | undefined>`、`getAllExhibits` 返回 `Promise<Exhibit[]>`，Task 5/6 均 `await` 使用，一致。
