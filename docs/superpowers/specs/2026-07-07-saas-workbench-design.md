# SaaS 主页 · 工作台 设计文档

**日期**:2026-07-07
**状态**:已确认,待实现
**范围**:SaaS 顶层(项目之外)的工作台页面

## 一、定位与边界

SaaS 主页是**项目之外的顶层**。用户登录后先到 SaaS 主页,在工作台管理自己的项目和网关;点项目的"进入"才跳进项目内部(现有 ProjectLayout 体系)。

```
用户登录 → SaaS 主页(工作台)
              ├─ 管理项目 → 点「进入」→ 项目内部(ProjectLayout)
              └─ 管理网关 → 点「进入」→ 网关详情(后续)
```

**本次范围**:
- ✅ 做"工作台"页面(项目 + 网关两个 tab,卡片网格)
- ✅ 新增 SaaSLayout(顶部菜单横排)
- ✅ 顶部菜单其他 6 项建占位路由
- ❌ 不做其他 6 个菜单的真实页面
- ❌ 不改现有项目内任何页面

## 二、整体布局:顶部菜单横排

```
┌────────────────────────────────────────────────────────────┐
│ [Logo]  工作台 应用中心 文档中心 开发中心 运营中心 支付中心 系统管理   [李瀚 ▾] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│                       工作台内容区                           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

- **顶栏 48px**,浅色背景(与现有项目内部一致),底部 `box-shadow` 分隔
- **Logo 在左**:紫色方块(复用 `$color-primary`)+ 产品名
- **7 个菜单横排**,当前激活项紫色文字 + 底部 2px 紫色下划线;非激活项为 `$text-secondary`
- **用户信息在最右**:头像 + 姓名 + 下拉
- **没有左侧菜单**(这是和项目内部 ProjectLayout 的关键区别)

## 三、SaaSLayout 组件

新建 `src/layouts/SaaSLayout.vue`:
- 顶部菜单栏 + 主内容区(`<RouterView />`)
- 菜单数据写死在组件内(7 项:工作台/应用中心/文档中心/开发中心/运营中心/支付中心/系统管理)
- 当前激活项由路由匹配决定(`route.path` 前缀匹配)
- 复用现有设计 token(主题紫 `#6e4bff`、文字色阶、圆角)

## 四、工作台页面

新建 `src/views/workbench/WorkbenchView.vue`,内含两个 tab:**项目管理** / **网关管理**。

### Tab 结构
- 顶部:tab 切换栏(与现有 SubTabLayout 风格一致) + 右侧操作按钮("新增项目"/"绑定网关")
- 下方:卡片网格(3 列,响应式:窄屏 2 列)

### Tab 1 · 项目管理

**卡片网格**,每张卡片信息:
| 字段 | 说明 |
|------|------|
| 项目名 | 主标题,加粗 |
| 状态标签 | 启用(青蓝绿)/ 停用(灰) |
| 场景 | 通用/安防/商业体/公寓/养老 |
| 设备数 | "N 设备" |
| 更新时间 | "N 小时前" |
| 进入入口 | 紫色"进入 →",点击跳转项目内部 |

网格末尾固定一张**虚线边框的"新建项目"卡片**(点击触发新增 Modal)。

**"新增项目" Modal**:
- 项目名(输入框)
- 场景(选择器:通用/安防/商业体/公寓/养老,复用现有场景定义)
- 确认后加入项目列表

### Tab 2 · 网关管理

**卡片网格**,每张卡片信息:
| 字段 | 说明 |
|------|------|
| 网关名 | 主标题 |
| 在线状态 | ● 在线(青蓝绿圆点)/ ○ 离线(灰圆点) |
| 型号 | 如 JetLinks-Edge-2000 |
| 通道数 | "N 通道" |
| 进入入口 | 紫色"进入 →"(本次跳占位路由,后续做详情) |

网格末尾固定一张**"绑定网关"卡片**。

**"绑定网关" Modal**:
- 网关名称(输入框)
- 型号(输入框)
- 序列号(输入框)
- 确认后加入网关列表

## 五、路由结构

```
/                        → 重定向到 /workbench(改:原 /ai-search-hub)

/saas                    → SaaSLayout(新顶层布局)
  /workbench             → WorkbenchView(工作台,本次重点)
  /apps                  → 占位(应用中心)
  /docs                  → 占位(文档中心)
  /dev                   → 占位(开发中心)
  /ops                   → 占位(运营中心)
  /billing               → 占位(支付中心)
  /saas-system           → 占位(系统管理)

/project/:id/...         → 现有 ProjectLayout(项目内部,不变)
```

- 根路径 `/` 改为重定向到 `/workbench`
- 现有项目内路由不动,只是被工作台"进入项目"调用
- SaaS 顶层路由用 SaaSLayout 包裹,和项目内 ProjectLayout 平级、互不嵌套

## 六、Mock 数据

新建 `src/views/workbench/workbench.mock.ts`:

**projects**(3-4 个,对应现有场景):
```ts
interface Project {
  id: string
  name: string         // 办公室场景项目 / 商场安防项目 / 工厂EHS项目
  scenario: string     // general | security | commercial | apartment | elderly
  status: 'enabled' | 'disabled'
  deviceCount: number
  updatedAt: string    // 相对时间
}
```

**gateways**(3-4 个,复用 devices.mock.ts 的网关名):
```ts
interface Gateway {
  id: string
  name: string         // E栋网关1 / E栋网关2 / A栋网关
  status: 'online' | 'offline'
  model: string        // JetLinks-Edge-2000
  channelCount: number
}
```

## 七、不做的事(YAGNI)

- ❌ 项目/网关的编辑、删除(本次只有新增 + 进入)
- ❌ 项目/网关的搜索、筛选、排序(卡片少,后续加)
- ❌ 其他 6 个顶部菜单的真实页面(占位)
- ❌ 网关"进入"后的详情页(本次占位)
- ❌ 修改现有项目内任何页面

## 八、改动文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/layouts/SaaSLayout.vue` | 新建 | SaaS 顶层布局(顶部菜单横排) |
| `src/views/workbench/WorkbenchView.vue` | 新建 | 工作台(项目/网关两个 tab + 卡片网格 + 新增/绑定 Modal) |
| `src/views/workbench/workbench.mock.ts` | 新建 | 项目 + 网关 mock 数据 |
| `src/router/index.ts` | 修改 | 加 SaaSLayout 路由组 + 根路径重定向改 /workbench |

## 九、验证标准

- `pnpm type-check` 通过
- 访问 `/` 重定向到 `/workbench`
- 工作台默认显示"项目"tab,卡片网格含 3-4 个项目 + 1 个"新建项目"卡片
- 切换到"网关"tab,显示网关卡片 + "绑定网关"卡片
- 点"新增项目"弹出 Modal,确认后项目卡片增加
- 点项目的"进入"跳转到项目内部(现有 ProjectLayout,如 `/dashboard`)
- 顶部菜单 7 项,当前激活"工作台",点其他菜单跳转占位页
