# 展品管理 Web 后台（第二阶段：内容管理）设计文档

日期：2026-08-18
状态：已确认

## 目标与范围

第一阶段已把展品数据迁到微信云开发（`exhibits` 集合 + 只读云函数 `getExhibits`），小程序端读通路已跑通。但内容维护目前只能在云开发控制台手动改，非技术人员难用。

本阶段做**独立的 Web 管理后台**：管理员在电脑浏览器登录，维护展品的名称、朝代、文本描述、图片、音频、视频，支持把媒体上传到云存储，也支持粘贴外部链接。小程序端**不改动**，后台改完即时生效。

**本阶段做：**
- 一个独立 Vue3 Web 后台，托管到 CloudBase 静态网站托管，直连现有云环境 `cloud1-d6gnwyekz0f64654f`。
- 账号密码登录（CloudBase 自带）。
- 展品列表、新增、编辑、删除。
- 媒体「上传云存储 / 填外部链接」两种模式都支持。
- 新增写云函数 `manageExhibit`，做管理员鉴权 + 增改删。

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
               │ @cloudbase/js-sdk                    │ wx.cloud
               │ (账号密码登录)                        │
               ▼                                      ▼
        ┌──────────────────────────────────────────────────┐
        │   微信云开发环境 cloud1-d6gnwyekz0f64654f          │
        │  ┌───────────┐ ┌──────────────┐ ┌──────────────┐  │
        │  │ exhibits  │ │ 云函数        │ │ 云存储        │  │
        │  │ 集合(共用)│ │ getExhibits  │ │ (图/音/视频)  │  │
        │  │           │ │ manageExhibit│ │              │  │
        │  └───────────┘ └──────────────┘ └──────────────┘  │
        └──────────────────────────────────────────────────┘
```

- **读**复用现有 `getExhibits`（列表 / 单查），不改。
- **写**（增/改/删）全部走新云函数 `manageExhibit`，云函数校验管理员白名单后才操作库；浏览器端 SDK **不直接写库**，从根上杜绝越权。
- 媒体上传直传云存储得到 `cloud://` fileID，存入对应字段；小程序端天然能渲染 `cloud://`，无需域名白名单。

## 二、数据模型（沿用第一阶段，不改结构）

`exhibits` 集合每个文档字段：`_id`、`exhibitId`（业务编号，二维码用）、`name`、`dynasty`（可选）、`image`、`text`、`audioUrl`、`videoUrl`。媒体字段兼容 `cloud://` 与 `https://`。详见第一阶段设计文档。

## 三、Web 后台项目 `admin/`

仓库内新增目录 `admin/`，Vue 3 + Vite + Element Plus + Vue Router，依赖 `@cloudbase/js-sdk`。

**核心封装 `src/cloudbase.ts`：** 初始化 CloudBase（env = `cloud1-d6gnwyekz0f64654f`），封装 `login` / `logout` / `callFunction` / `uploadFile` / `getTempFileURL`。

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

## 四、云函数 `manageExhibit`

位置：`cloudfunctions/manageExhibit/`，Node.js + `wx-server-sdk`（与 `getExhibits` 同风格）。

- 入口按 `event.action` 分支：`create` / `update` / `delete`。
- **每次先鉴权**：取调用者身份（登录态 uid / openid），比对管理员白名单（环境变量或 `admins` 集合），非管理员直接拒绝。
- `create`：`exhibitId` 必填 + 集合内查重，写入文档。
- `update`：按 `exhibitId` / `_id` 更新。
- `delete`：按 `exhibitId` / `_id` 删除。
- 统一返回 `{ ok: true, data }` 或 `{ ok: false, error }`。

## 五、媒体上传流程

1. 后台选文件 → `@cloudbase/js-sdk` 的 `uploadFile` 直传云存储，得 `cloud://` fileID。
2. fileID 存进 `image` / `audioUrl` / `videoUrl` 字段。
3. 列表/编辑页回显时，用 `getTempFileURL` 把 `cloud://` 换成临时 https 预览。
4. 小程序端本来就能直接渲染 `cloud://`，无需改动。

## 六、数据安全

- `exhibits` 集合权限：所有人可读、仅管理端可写（写只经云函数）。
- 云存储安全规则：限制写权限。
- 所有写操作经 `manageExhibit` 鉴权，浏览器端不直接写库/存储敏感操作。

## 七、测试策略（手动验证）

1. `cd admin && npm run dev`，用测试管理员账号登录。
2. 新增一条展品 → 上传图片/音频（或填外链）→ 保存。
3. 微信开发者工具打开小程序，输入该 `exhibitId`，确认图文/音视频正常显示。
4. 编辑、删除各验证一遍，列表实时刷新。
5. `manageExhibit` 用非管理员/未登录调用应被拒绝。
6. 部署到 CloudBase 静态托管，用真实域名再走一遍。

## 八、依赖用户的账号操作（非写代码）

- CloudBase 开通账号密码登录，创建测试管理员账号。
- 配置 `exhibits` 集合读写权限、云存储安全规则。
- 部署 `manageExhibit`，配置管理员白名单。
- 部署静态托管，拿到后台访问地址。
