## 引导步骤重新设计

### 问题
当前 `GatewayAddressView` 是独立全屏页面（在 ProjectLayout 之外），GuideOverlay 没有挂载，导致 `gw-address`、`scan-device`、`select-device`、`bind-device` 等步骤在地址页中无法显示引导提示。

### 解决方案
在 `GatewayAddressView.vue` 中挂载 GuideOverlay 组件，并在其中实现引导步骤联动。

### 完整引导步骤流程

#### 在线流程（网关上线·已配置/未配置）
```
add-gateway → bind-gateway → gw-online-configured/gw-online-empty
→ goto-config → gw-address → scan-device → select-device → bind-device → done
```

#### 离线流程
```
add-gateway → bind-gateway → gw-offline → (更新通道) 
→ gw-online-configured/gw-online-empty → goto-config → gw-address 
→ scan-device → select-device → bind-device → done
```

### 文件改动

#### 1. `src/views/video/GatewayAddressView.vue` — 挂载 GuideOverlay + 引导联动
- 导入 `GuideOverlay` 组件和 `useAppStore`
- 在模板根部添加 `<GuideOverlay />`
- 新增按钮添加 `data-guide="gw-address-add"` 属性
- `openAddModal` 中检查 `guideStep === 'gw-address'` → `setGuideStep('scan-device')`
- `startScan` 完成后检查 `guideStep === 'scan-device'` → `setGuideStep('select-device')`
- `goToAuth` 中检查 `guideStep === 'select-device'` → `setGuideStep('bind-device')`
- `handleBind`/`confirmPartial` 成功后检查引导 → `setGuideStep('done')`
- 弹窗 z-index 和 mask-closable 在引导模式下调整

#### 2. `src/components/GuideOverlay.vue` — 更新步骤配置
- 更新 `videoSteps` 数组（用于步骤计数）
- 更新 `isBranchStep`：确认 `gw-online-configured`、`gw-online-empty`、`gw-offline` 为分支步骤
- `gw-online-configured`/`gw-online-empty` 的"继续接入"/"前往绑定"按钮 → `setGuideStep('goto-config')`
- `done` 步骤的按钮：跳过 + 去配置告警
- 各步骤的 title/desc 文案更新为合理的步骤编号

#### 3. `src/views/video/DeviceManageView.vue` — 无需改动
- `gotoGatewayConfig` 已经正确设置 `gw-address` 并跳转到 `/address`
- `handleGuideBindSelect` 的三个分支路径不变

#### 4. `src/views/video/GatewayConfigView.vue` — 清理
- 保留原有功能不变，但移除引导相关的死代码（onMounted 引导钩子、startScan/goToAuth/handleBind 中的 guideStep 检查），因为引导流程现在走 GatewayAddressView

### 步骤编号设计
| 步骤 | GuideStep | 标题 |
|------|-----------|------|
| 1 | add-gateway | 第一步：添加网关 |
| 2 | bind-gateway | 第二步：绑定网关 |
| - | gw-online-configured/empty/offline | 分支提示页（不显示步骤号）|
| 3 | goto-config | 第三步：配置设备 |
| 4 | gw-address | 第四步：新增设备 |
| 5 | scan-device | 第五步：一键同步 |
| 6 | select-device | 第六步：选择设备 |
| 7 | bind-device | 第七步：输入密码绑定 |
| 8 | done | 绑定成功 |
