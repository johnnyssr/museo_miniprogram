# 博物馆讲解小程序 Demo 设计文档

日期：2026-07-10
状态：已确认

## 目标

一个微信小程序 demo：游客扫描展品二维码后，进入该展品的详情页，查看**文字介绍、语音介绍、视频介绍**。

## 范围与约定（本 demo）

- 数据：完全本地 mock 数据，不接后端/云开发。
- 扫码：只做「扫一扫」按钮，调用 `wx.scanCode`（真机调摄像头，开发者工具弹出模拟输入框）。
- 详情页布局：图文为主，语音/视频作为可展开区块。
- 媒体资源：使用公开示例媒体 URL（音频/视频），真机可真正播放。
- 不引入自动化测试框架（YAGNI），采用手动验证。

## 一、整体架构

三个页面/模块 + 一层数据服务：

- **首页 `pages/index`** —— 「扫一扫」按钮，调用 `wx.scanCode`，解析出展品 ID，跳转详情页。
- **详情页 `pages/exhibit`** —— 根据 ID 展示：展品图片 + 文字介绍（默认显示），语音区块（点击展开/播放），视频区块（点击展开/播放）。
- **数据服务 `services/exhibit.ts`** —— 本地 mock 数据 + `getExhibitById(id)` 查询函数。所有数据从这里取，页面不直接碰 mock 数组。
- **类型定义 `models/exhibit.ts`** —— `Exhibit` 接口。

数据流：

```
扫码 → 拿到 id → wx.navigateTo(?id=xxx) → 详情页 onLoad 用 id 调 getExhibitById → setData 渲染
```

## 二、数据模型与 mock 数据

```ts
interface Exhibit {
  id: string          // 展品唯一标识，二维码里编码的就是它
  name: string        // 展品名称
  dynasty?: string    // 年代（如「唐代」），可选
  image: string       // 展品图片 URL
  text: string        // 文字介绍
  audioUrl: string    // 语音介绍 URL
  videoUrl: string    // 视频介绍 URL
}
```

- Mock 数据准备 **3 个展品**（如青铜器、书画、陶瓷各一件）。
- 图片用公开占位图；音频/视频用微信官方公开示例地址，保证真机能播。
- 二维码内容约定：直接是展品 id（如 `exhibit-001`）。`wx.scanCode` 拿到 `result` 后当作 id 查询；查不到 toast 提示「未找到该展品」。

## 三、详情页交互与错误处理

布局（图文为主，语音/视频可展开）：

- 顶部：展品图片 + 名称 + 年代。
- 中部：文字介绍（始终显示）。
- 底部两个可展开区块：
  - **语音介绍** —— 点击标题栏展开，内部放播放/暂停按钮 + 进度提示，用 `wx.createInnerAudioContext` 控制。
  - **视频介绍** —— 点击标题栏展开，内部放 `<video>` 组件，展开时才渲染（懒加载省资源）。

交互细节：

- 音频用 `InnerAudioContext`，页面 `onUnload` 时 `destroy()` 释放，避免离开页面还在播。
- 语音和视频各自独立展开；播放视频时不强制停音频（demo 从简，不做互斥）。
- 展开状态用 data 里的 `audioExpanded` / `videoExpanded` 布尔值控制。

错误处理：

- 扫码取消/失败：`wx.scanCode` 的 fail 回调静默处理（用户主动取消不弹错）。
- id 查不到：跳转前 toast 拦截，或详情页显示「未找到该展品」空状态。
- 媒体加载失败：`<video>` 和音频的 error 事件里 toast 提示「加载失败」。

## 四、测试策略

采用手动验证：

1. **数据服务** —— `getExhibitById` 已知 id 返回正确展品、未知 id 返回 `undefined`。
2. **首页扫码** —— 开发者工具点「扫一扫」→ 模拟输入框输入 `exhibit-001` → 正确跳转详情页。
3. **详情页** —— 图文正常显示；点开语音能播放/暂停；点开视频能加载播放；离开页面音频停止。
4. **错误路径** —— 输入不存在的 id → 空状态；开发者工具需勾选「不校验合法域名」才能播放网络媒体。

不引入自动化测试框架。若以后接真实后端，再给数据服务层加单测。

## 文件清单（预计新增/修改）

- `miniprogram/models/exhibit.ts`（新增）
- `miniprogram/services/exhibit.ts`（新增）
- `miniprogram/pages/index/*`（改造为扫码首页）
- `miniprogram/pages/exhibit/*`（新增详情页）
- `miniprogram/app.json`（注册页面、导航栏标题）
