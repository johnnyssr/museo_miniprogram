# 展品管理 Web 后台（第二阶段：内容管理）设计文档

日期：2026-08-18（2026-08-28 更新写入鉴权方案）
状态：已确认（已实现）

## 目标与范围

第一阶段已把展品数据迁到微信云开发（`exhibits` 集合 + 只读云函数 `getExhibits`），小程序端读通路已跑通。但内容维护目前只能在云开发控制台手动改，非技术人员难用。

本阶段做**独立的 Web 管理后台**：管理员在电脑浏览器登录，维护展品的名称、朝代、文本描述、图片、音频、视频，支持把媒体上传到云存储，也支持粘贴外部链接。小程序端**不改动**，后台改完即时生效。

**本阶段做：**
- 一个独立 Vue3 Web 后台，托管到 CloudBase 静态网站托管，直连现有云环境 `cloud1-d6gnwyekz0f64654f`。
- 账号密码登录（CloudBase 自带）。
- 展品列表、新增、编辑、删除。
- 媒体「上传云存储 / 填外部链接」两种模式都支持。
- 写操作用 SDK 直连数据库，鉴权交给**数据库安全规则**（读放开、写仅登录用户）。

**本阶段不做（YAGNI）：**
- 二维码/小程序码生成、批量导入、富文本编辑、多角色权限、审计日志。
- 小程序端任何改动。

## 关键决策（已确认）

| 维度 | 选择 |
|---|---|
| 后台形态 | 独立 Web 管理端（非小程序内页面） |
| 前端技术 | Vue 3 + Vite + Element Plus + Vue Router |
| 登录方式 | 账号密码登录（CloudBase 自带） |
| 媒体处理 | 上传云存储 + 外部链接两种模式都支持 |
| 托管 | CloudBase 静态网站托管 |

## 一、架构

```
┌─────────────────────────────┐         ┌──────────────────────────┐
│  管理员浏览器                 │         │  微信小程序(现有,不改)    │
│  Vue3 + Element Plus 后台     │         │  游客扫码/浏览            │
└──────────────┬──────────────┘         └───────────┬──────────────┘
       读│callFunction  写│database()               │ wx.cloud
        (账号密码登录，写受安全规则约束)              │
               ▼                                      ▼
        ┌──────────────────────────────────────────────────┐
        │   微信云开发环境 cloud1-d6gnwyekz0f64654f          │
        │  ┌───────────┐ ┌──────────────┐ ┌──────────────┐  │
        │  │ exhibits  │ │ 云函数        │ │ 云存储        │  │
        │  │ 集合(共用)│ │ getExhibits  │ │ (图/音/视频)  │  │
        │  │ 安全规则  │ │ (只读)       │ │              │  │
        │  └───────────┘ └──────────────┘ └──────────────┘  │
        └──────────────────────────────────────────────────┘
```

- **读**复用现有 `getExhibits`（列表 / 单查），不改。
- **写**（增/改/删）用 `@cloudbase/js-sdk` 的 `database()` **直连 `exhibits` 集合**。鉴权由**数据库安全规则**把关：`{ "read": true, "write": "auth != null" }` —— 未登录的写请求被 CloudBase 直接拒绝，无需应用层口令/白名单。
- 媒体上传直传云存储得到 `cloud://` fileID，存入对应字段；小程序端天然能渲染 `cloud://`，无需域名白名单。

> **写入鉴权的取舍（2026-08-28）**：最初设计用云函数 `manageExhibit` 做管理员鉴权。但本环境为「微信云开发」，`getWXContext()` 只对小程序调用返回身份；经 `@cloudbase/js-sdk`（账号密码登录）调用云函数时上下文只有 `SOURCE=web_client`，拿不到用户身份（`caller` 为空），无法在函数内判断管理员。曾以「共享口令」临时把关，但维护繁琐。最终改为 **SDK 直连数据库 + 安全规则**：登录态天然带 `auth`，安全规则按 `auth != null` 放行，每个维护者用自己的账号登录即可。`manageExhibit` 云函数因此废弃。

## 二、数据模型（沿用第一阶段，不改结构）

`exhibits` 集合每个文档字段：`_id`、`exhibitId`（业务编号，二维码用）、`name`、`dynasty`（可选）、`image`、`text`、`audioUrl`、`videoUrl`。媒体字段兼容 `cloud://` 与 `https://`。详见第一阶段设计文档。

## 三、Web 后台项目 `admin/`

仓库内新增目录 `admin/`，Vue 3 + Vite + Element Plus + Vue Router，依赖 `@cloudbase/js-sdk`。

**核心封装 `src/cloudbase.ts`：** 初始化 CloudBase（env = `cloud1-d6gnwyekz0f64654f`，只需 `env` + `region`），封装 `login` / `logout` / `currentUserId`、只读 `fetchExhibits`（走 `getExhibits`）、写操作 `createExhibit` / `updateExhibit` / `deleteExhibit`（`database()` 直连集合），以及 `uploadMedia` / `toPreviewUrl`（云存储）。写操作只保留字段白名单，避免写回 `_id` 等意外字段。

**页面：**

| 页面 | 路由 | 内容 |
|---|---|---|
| 登录 | `/login` | 账号+密码登录，成功进列表。路由守卫：未登录跳登录页。 |
| 展品列表 | `/exhibits` | Element Plus 表格：缩略图、名称、朝代、exhibitId、编辑/删除；顶部「新增展品」。数据用 `getExhibits` 拉取。 |
| 展品编辑 | `/exhibits/new`、`/exhibits/:id/edit`（或弹窗） | 表单，填/改所有字段 + 媒体上传。 |

**编辑表单字段：**
- `exhibitId` 编号（新增必填 + 查重；二维码用它）
- `name` 名称（必填）
- `dynasty` 朝代（选填）
- `text` 文本描述（多行）
- `image` / `audioUrl` / `videoUrl`：每个都可「上传云存储」**或**「填外部链接」二选一切换；上传成功存 `cloud://` fileID 并回显预览。

## 四、写操作：SDK 直连数据库 + 安全规则

写路径不再经云函数，直接用 `app.database().collection('exhibits')` 操作，鉴权交给数据库安全规则：

- `createExhibit`：`exhibitId` / `name` 必填 + 按 `exhibitId` 查重，`add(doc)` 写入（js-sdk 的 `add` 直接收文档，不套 `{ data }`）。
- `updateExhibit`：按 `_id` `doc(_id).update(doc)`。
- `deleteExhibit`：优先按 `_id`，否则按 `exhibitId` `where().remove()`。
- 三者都先过字段白名单 `pickFields`（`exhibitId,name,dynasty,image,text,audioUrl,videoUrl`），只写允许的字段。

**安全规则**（控制台「文档型数据库 → exhibits → 权限设置」自定义安全规则）：

```json
{ "read": true, "write": "auth != null" }
```

未登录的写请求被 CloudBase 拒绝；登录态自动携带 `auth`，故任何登录用户可维护。需**关闭匿名登录**，使「已登录 = 持账号的管理员」。

> `manageExhibit` 云函数已废弃（原基于口令/白名单鉴权），仓库不再保留其代码；若曾在控制台部署过，可一并删除。

## 五、媒体上传流程

1. 后台选文件 → `@cloudbase/js-sdk` 的 `uploadFile` 直传云存储，得 `cloud://` fileID。
2. fileID 存进 `image` / `audioUrl` / `videoUrl` 字段。
3. 列表/编辑页回显时，用 `getTempFileURL` 把 `cloud://` 换成临时 https 预览。
4. 小程序端本来就能直接渲染 `cloud://`，无需改动。

## 六、数据安全

- `exhibits` 集合安全规则：`{ "read": true, "write": "auth != null" }` —— 所有人可读、仅登录用户可写。
- 关闭匿名登录，令「已登录」等价于「持有账号的管理员」。
- 云存储安全规则：按需限制写权限（默认登录可写即可满足后台上传）。
- 写操作全部要求登录态（`auth != null`），未登录请求由 CloudBase 拒绝；前端另有路由守卫，未登录跳登录页。

## 七、测试策略（手动验证）

1. `cd admin && npm run dev`，用测试管理员账号登录。
2. 新增一条展品 → 上传图片/音频（或填外链）→ 保存。
3. 微信开发者工具打开小程序，输入该 `exhibitId`，确认图文/音视频正常显示。
4. 编辑、删除各验证一遍，列表实时刷新。
5. 未登录时写操作应被安全规则拒绝（登录能写、退出后不能写）。
6. 部署到 CloudBase 静态托管，用真实域名再走一遍。

## 八、依赖用户的账号操作（非写代码）

- CloudBase 开通账号密码登录，创建管理员账号；**关闭匿名登录**。
- 给 `exhibits` 集合配安全规则 `{ "read": true, "write": "auth != null" }`；按需配云存储安全规则。
- 部署静态托管，拿到后台访问地址。

## 九、展品小程序码（2026-08-29 增补）

> 原 YAGNI 列表把「二维码/小程序码生成」排除在首期外；上线后按用户需求增补此功能。

**目标**：后台为每个展品生成可下载的**小程序码**，微信原生「扫一扫」与小程序内「扫一扫」扫码都能进入对应展品详情页（普通文本二维码只有小程序内扫一扫可识别，故不采用）。

**实现**：

- 新增云函数 `cloudfunctions/getExhibitQRCode`：`cloud.openapi.wxacode.getUnlimited({ scene: exhibitId, page: 'pages/exhibit/exhibit', envVersion, checkPath: false, width: 430 })`，返回图片 base64（`{ ok, contentType, base64 }`）。
- 小程序展品页 `onLoad` 兼容入口：`query.id`（列表/文本扫码）与 `query.scene`（小程序码）。**这是对小程序的唯一改动。**
- 后台 `cloudbase.ts` 加 `fetchExhibitQRCode(exhibitId, envVersion)` → 返回 data URL；列表页每行「二维码」按钮打开弹窗预览 + 下载 PNG，含 `release/trial/develop` 版本选择。

**约束**：

- `scene` 上限 32 字符，仅支持数字/字母及 `!#$&'()*+,/:;=?@-._~`。
- `envVersion=release` 需小程序**已发布正式版**，游客扫码才生效；发布前用 `trial/develop` 自测（仅体验成员/开发者可扫）。
- 云函数经 web 端 `callFunction` 调用；`wxacode` 用小程序 app 级凭证，与调用方身份无关，故 web_client 调用可正常生成。
