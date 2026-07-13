## 实现计划：TCP 设备接入页面 + 引导增强

### 概述
将 `DeviceDetailView.vue` 的「设备接入」Tab 从占位替换为完整的 TCP 接入配置页面（参考 JetLinks 平台截图风格），并增强 IoT 引导流程。

---

### 第一步：在 `mock.ts` 中添加 TCP 接入数据

新增以下数据结构和 mock 数据：

```ts
// TCP 接入配置
interface TcpAccessConfig {
  protocol: string        // 'TCP'
  transport: string       // 'TCP'
  tls: boolean            // 是否加密
  heartbeat: number       // 心跳间隔(秒)
  ip: string              // 接入IP
  port: number            // 接入端口
  domain: string          // 域名
}

// 设备凭证
interface DeviceCredential {
  deviceId: string        // 设备ID
  secureKey: string       // 密钥
  productKey: string      // 产品标识
}

// Topic 定义
interface TopicItem {
  direction: 'up' | 'down'  // 上行/下行
  name: string               // Topic名称
  path: string               // Topic路径
  desc: string               // 说明
}
```

导出 `tcpAccessConfig`、`deviceCredential`、`topicList` 三组数据。

---

### 第二步：实现 DeviceDetailView.vue 的「设备接入」Tab

页面布局（完整分区块展示，复用项目现有 SCSS 卡片风格）：

```
┌──────────────────────────────────────────────────┐
│ ⚠️ 提示条：设备尚未连接（黄底）或 已连接（绿底）    │
├──────────────────────────────────────────────────┤
│ 📡 接入方式卡片                                    │
│   协议: TCP │ 传输: TCP │ 加密: 不加密 │ 心跳: 60s │
├──────────────────────────────────────────────────┤
│ 🌐 接入地址卡片                                    │
│   IP地址: 192.168.1.100 [复制]                     │
│   端口: 8802 [复制]                                │
│   域名: tcp.jetlinks.cn [复制]                     │
├──────────────────────────────────────────────────┤
│ 🔑 设备凭证卡片（data-guide="iot-credential"）    │
│   设备ID: dev-001          [📋复制]                │
│   密钥:   a1b2c3d4e5f6     [📋复制]                │
│   产品标识: prod-key-001   [📋复制]                │
├──────────────────────────────────────────────────┤
│ 📋 Topic 列表卡片                                 │
│   ▲ 属性上报  /dev-001/properties/report          │
│   ▲ 事件上报  /dev-001/events/report              │
│   ▼ 指令下发  /dev-001/command/send               │
│   ▼ 属性读取  /dev-001/properties/read            │
├──────────────────────────────────────────────────┤
│ 💻 连接示例卡片（data-guide="iot-connect-test"）  │
│   [代码块：TCP连接代码示例]                        │
│                              [模拟连接测试] 按钮   │
└──────────────────────────────────────────────────┘
```

**交互功能**：
- 复制按钮：点击复制对应值到剪贴板，显示 `message.success('已复制')`
- 模拟连接测试：点击后按钮变为 loading → 1.5s 后设备状态从 `offline` 变为 `online`，提示条变绿色

**样式风格**：
- 复用现有 `.ov-section` 卡片模式（白底 + 圆角12px + 头部带图标）
- label-value 行布局，值用等宽字体
- 上行 Topic 用青绿色箭头 `▲`，下行用主色箭头 `▼`
- 代码块用深色背景 `#1e1e2e` + 等宽字体

---

### 第三步：增强引导流程

在 `app.ts` 的 GuideStep 类型中新增 2 个步骤：

```ts
| 'iot-access'        // 指向「设备接入」tab（已有）
| 'iot-credential'    // 新增：指向设备凭证区，提示复制凭证
| 'iot-connect-test'  // 新增：指向「模拟连接测试」按钮，提示点击测试
| 'iot-done'          // IoT 引导完成（已有）
```

在 `GuideOverlay.vue` 的 `stepConfigs` 中添加这两个步骤的配置。

在 `DeviceDetailView.vue` 中添加引导联动逻辑：
- `iot-access` → 用户点击「设备接入」tab → 推进到 `iot-credential`
- `iot-credential` → 用户点击任意「复制」按钮 → 推进到 `iot-connect-test`
- `iot-connect-test` → 用户点击「模拟连接测试」→ 连接成功后推进到 `iot-done`

更新 `GuideOverlay.vue` 的 `iotSteps` 数组，包含新步骤。

---

### 涉及修改的文件

| 文件 | 改动 |
|------|------|
| `src/views/iot/mock.ts` | 新增 `TcpAccessConfig`、`DeviceCredential`、`TopicItem` 类型 + mock 数据 |
| `src/views/iot/DeviceDetailView.vue` | 替换「设备接入」占位为完整 TCP 接入页面 + 引导联动逻辑 |
| `src/stores/app.ts` | GuideStep 类型新增 `iot-credential`、`iot-connect-test` |
| `src/components/GuideOverlay.vue` | stepConfigs 新增 2 个步骤配置 + 更新 iotSteps 数组 |

### 不改动的部分
- 不改动 DeviceListView 的引导流程（iot-add → iot-select → iot-config → iot-detail 已正常工作）
- 不改动其他 tab（概览/设备指令/设备数据/设备日志仍保持现状）
- 不改动路由和全局状态结构