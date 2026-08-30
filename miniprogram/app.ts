// app.ts
App<IAppOption>({
  globalData: {},
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('当前基础库版本过低，无法使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-d9g0ig4ad8e90ecde',
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