# 展品初始数据录入清单

**操作说明：** 在微信开发者工具「云开发控制台 → 数据库」中：

1. 新建集合 `exhibits`。
2. 设置集合权限：**「所有用户可读，仅创建者可读写」**（展品是公开数据，需所有用户可读；写入由管理端负责）。
3. 逐条「新增记录」，把下面 3 个 JSON 分别录入（`_id` 可留空由系统自动生成）。

> 媒体地址第一阶段沿用现有 http 外链。真机需在「服务器域名 → downloadFile 合法域名」配置：`https://mmbiz.qpic.cn;https://downsc.chinaz.net;https://www.chnmuseum.cn`

---

## 记录 1

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

## 记录 2

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

## 记录 3

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
