// app.ts
App<IAppOption>({
  globalData: {},
  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('当前基础库版本过低，无法使用云能力')
    } else {
      wx.cloud.init({
        env: 'beibuwan-d8gx5w5nka63192ae',
        traceUser: true,
      })
    }
  },
})
