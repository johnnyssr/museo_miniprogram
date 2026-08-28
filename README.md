# 博物馆讲解小程序

一个面向博物馆参观者的微信小程序：观众通过**扫描展品二维码**或**浏览展品列表**，即可查看该展品的**文字介绍、语音讲解和视频介绍**。

> 当前为 Demo 阶段。展品数据已迁至**微信云开发**云数据库，小程序通过云函数读取；并提供了 Web 管理后台（`admin/`）用于维护展品内容与上传媒体。

## 功能

- **扫一扫**：调用 `wx.scanCode` 扫描展品二维码，解析出展品编号后进入详情页。
- **浏览全部展品**：不想扫码时，可从首页进入展品列表，以卡片形式浏览所有展品。
- **展品详情**：图文介绍常驻显示；语音讲解、视频介绍作为可展开区块，按需加载播放。
  - 语音使用 `InnerAudioContext`，离开页面自动释放。
  - 视频展开时才渲染，节省资源。

## 页面结构

| 页面 | 路径 | 说明 |
|---|---|---|
| 首页 | `pages/index` | 「扫一扫」主操作 +「浏览全部展品」入口 |
| 展品列表 | `pages/list` | 全部展品的卡片列表（图 + 名称 + 年代） |
| 展品详情 | `pages/exhibit` | 图文 / 语音 / 视频介绍 |

## 目录说明

```
miniprogram/
├── models/exhibit.ts      # Exhibit 类型定义
├── services/exhibit.ts    # 数据访问层：调用云函数读取展品（getExhibitById / getAllExhibits，异步）
├── pages/
│   ├── index/             # 首页
│   ├── list/              # 展品列表页
│   └── exhibit/           # 展品详情页
└── app.json               # 页面注册与全局配置
cloudfunctions/
└── getExhibits/           # 云函数：查询展品（传 exhibitId 查单个，不传查全部）
admin/                     # 展品管理 Web 后台（Vue3 + Vite + Element Plus，独立静态站点）
docs/superpowers/          # 设计文档、实现计划、数据录入清单
test/                      # 展品测试二维码（exhibit-001/002/003）
```

数据访问统一收敛在 `services/exhibit.ts`：页面不直接访问数据库，只调用 `getExhibitById(id)` 和 `getAllExhibits()`（内部走云函数 `getExhibits`）。数据来源变化只需改动该 service 层，页面代码不受影响。

## 首次运行准备（重要）

从仓库拉取代码后，**必须完成以下两项**，否则运行会报错。

### 1. 启用 TypeScript 编译

本项目页面逻辑用 TypeScript（`.ts`）编写，依赖开发者工具的内置 TS 编译插件。若拉取后运行报类似
`Component "pages/index/index" does not have a method "onScan"` 的错误，
说明 `.ts` 未被编译成运行时代码。请确认：

- 使用**较新版本**的微信开发者工具（旧版可能不支持内置 TS 插件）。
- 通过「导入项目」指向**仓库根目录**，让 `project.config.json` 被正确读取（其中已启用 `useCompilerPlugins: ["typescript"]`）。
- 导入后点一次「编译」，确认无上述报错。

### 2. 配置微信云开发

展品数据存于云数据库，需先完成云开发配置：

1. **开通云开发**：开发者工具点「云开发」，用小程序账号开通，创建一个云环境，记下**环境 ID**。
2. **填写环境 ID**：把 `miniprogram/app.ts` 中 `wx.cloud.init({ env: '...' })` 的 env 改成你自己的环境 ID。
   （仓库当前填的是原作者的环境 ID，其他开发者需替换为自己的。）
3. **部署云函数**：右键 `cloudfunctions/getExhibits` →「上传并部署：云端安装依赖」。
   - 若右键无此菜单：重启开发者工具（使其识别 `cloudfunctionRoot`），并确认 `cloudfunctions` 根目录已关联你的云环境。
4. **建集合并录入数据**：在云开发控制台「数据库」新建集合 `exhibits`，按 `docs/superpowers/exhibits-seed-data.md` 录入 3 条初始记录。
   - 权限：小程序读取走云函数 `getExhibits`（服务端管理员权限），集合权限本身不影响小程序读。若同时使用 Web 管理后台，请按下文「展品管理后台」把安全规则设为 `{ "read": true, "write": "auth != null" }`。

完成后编译运行，列表页应能从云端加载出展品。

## 本地运行

1. 用[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)导入本项目（指向仓库根目录，`miniprogramRoot` 为 `miniprogram/`）。
2. 填入你自己的小程序 AppID。
3. 完成上面「首次运行准备」的两项。
4. 编译运行。

### 在模拟器中测试扫码

模拟器无法调用摄像头。点击「扫一扫」后会弹出输入框，直接输入展品编号即可进入详情页：

- `exhibit-001` — 青铜面具
- `exhibit-002` — 山水立轴
- `exhibit-003` — 青花瓷瓶

### 真机测试

1. 用文本二维码工具（如草料二维码）将 `exhibit-001` 等编号生成二维码（`test/` 目录已提供三张）。
2. 在开发者工具点「预览」或「真机调试」，手机微信扫码打开小程序。
3. 点「扫一扫」扫描展品二维码进入详情页。

> **网络媒体注意**：小程序真机加载网络图片/音频/视频，需在小程序后台「开发管理 → 开发设置 → 服务器域名」的 `downloadFile 合法域名` 中配置媒体所在域名。开发者工具中可临时勾选「不校验合法域名」测试。

## 展品管理后台（Web）

`admin/` 是一个**独立的网页后台**（Vue3 + Vite + Element Plus），供运营人员在电脑浏览器里维护展品：新增、编辑、删除，以及上传图片/音视频到云存储（也支持直接填外部链接）。它通过 `@cloudbase/js-sdk` 直连**同一个云环境**，复用 `exhibits` 集合；小程序端无需任何改动，后台改完数据即时生效。

设计详见 [docs/superpowers/specs/2026-08-18-admin-web-design.md](docs/superpowers/specs/2026-08-18-admin-web-design.md)。

### 架构

- **读**：复用小程序同款云函数 `getExhibits`（列表 / 单查）。
- **写**：登录后用 `@cloudbase/js-sdk` **直连云数据库** `exhibits` 集合（增/改/删）。鉴权由**数据库安全规则**把关：读放开、写仅限已登录用户，未登录调用会被 CloudBase 直接拒绝。
- **媒体**：上传直传云存储得到 `cloud://` fileID 存入字段；预览时用 `getTempFileURL` 换临时链接。小程序天然能渲染 `cloud://`。

### 云环境配置（首次，控制台操作）

1. **开通账号密码登录**：在 CloudBase 控制台「身份认证 → 登录方式」开通用户名密码登录，创建管理员账号。**关闭「匿名登录」**，确保「已登录 = 持有账号的管理员」。
2. **配 `exhibits` 集合安全规则**：控制台「文档型数据库 → exhibits → 权限设置」切到自定义安全规则，填：

   ```json
   { "read": true, "write": "auth != null" }
   ```

   含义：任何人可读（小程序游客能看），仅登录用户可写。每个维护者用自己的账号登录即可维护，无需额外口令/白名单。
3. **云存储**：按需在「云存储 → 权限设置」限制写权限（默认登录可写即可满足后台上传）。

> 无需创建 Web accessKey：`@cloudbase/js-sdk` 2.x 初始化只需 `env` + `region`。

### 本地运行

```bash
cd admin
npm install
npm run dev        # 打开 http://localhost:5173，用管理员账号密码登录
```

`admin/.env.local`（不入库）可覆盖云环境配置（一般无需改）：

```
VITE_CB_ENV=cloud1-d6gnwyekz0f64654f
VITE_CB_REGION=ap-shanghai
```

### 构建与部署（CloudBase 静态网站托管）

**1. 本地构建产物**

```bash
cd admin
npm run build      # 产物在 admin/dist/（index.html + assets/）
```

**2. 首次部署到静态网站托管**

CloudBase 控制台 →「**静态网站托管**」→「**网站部署**」→「**本地项目部署 → 本地项目上传**」，进入「文件上传部署」表单，按下表填写：

| 字段 | 填写 | 说明 |
|---|---|---|
| 项目文件类型 | 文件夹 | 选本机 `admin/dist`（其内容为 `index.html` + `assets/`） |
| 项目名称 | 自定义（如 `museo`） | 仅应用名，不影响访问路径 |
| **安装命令** | **留空** | 上传的是已构建成品，无 `package.json`，跑 `npm install` 会失败 |
| **构建命令** | **留空** | 同上，不要点「一键填写」（会自动填回 `npm install`/`npm run build`） |
| **构建产物目录** | `./` | 因为 `index.html` 就在上传内容的最外层（不是 `./dist`） |
| 部署路径 | `/` | 建议根路径；子路径会导致 `/assets/...` 加载不到而白屏 |

> ⚠️ 这个表单默认把上传物当**源码**并执行 install+build。我们上传的是 `dist` 成品，所以**两个命令必须留空**、构建产物目录填 `./`。

确认部署，等状态变「成功」后，在「部署版本」里得到访问域名（形如
`https://<项目名>-cloud1-xxxx.webapps.tcloudbase.com/`），打开即后台入口。

**3. 后续更新**

- **只改了展品内容（数据）**：无需重新部署，直接在后台增删改即可，公网 / 本地 / 小程序读的是同一个库，改完即时生效。
- **改了后台代码**：重新 `npm run build`，然后在该应用点「**更新版本**」重新上传 `admin/dist`（配置同上：命令留空、产物目录 `./`）。

> 本地 `npm run dev`（`localhost:5173`）与公网域名是同一后台的两个入口，连同一个云环境 `exhibits` 集合，在哪个改都写入同一个库。日常维护用公网地址即可，本地那套留作改代码/调试。免费默认域名够内部/测试用；上生产可在「基础配置」绑自定义域名。

## 技术栈

- 微信小程序（TypeScript）
- glass-easel 组件框架 / Skyline 渲染
- 页面统一使用 `Component()` 构造器
- 微信云开发（云数据库 + 云函数 + 云存储）
- 管理后台：Vue 3 + Vite + Element Plus + `@cloudbase/js-sdk`

## 后续演进方向

- **内容管理平台**：✅ 已提供 Web 后台（`admin/`），支持展品增删改与媒体上传。
- **媒体上云**：✅ 后台已支持把图片/音视频上传到云存储（`cloud://` 文件 ID）；存量外链可逐步替换。
- **小程序码**：按展品批量生成小程序码，实现「微信直接扫、小程序内扫」都能跳转对应展品。
- **可选功能**：多语言、检索、分类筛选、收藏、馆内地图导览等。

> 注：内容准备（文字撰写、配音、视频、文物摄影、二维码印刷布展）由馆方负责，不属于软件开发范畴，工作量随展品数量增长。
