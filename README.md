# JetLinks AI 原型

基于 Vue 3 + TypeScript 的原型项目。

## 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | Vue 3.4 (Composition API) |
| 语言 | TypeScript (strict) |
| 构建 | Vite 5 |
| UI 库 | Element Plus (按需自动导入) |
| 路由 | Vue Router 4 |
| 状态 | Pinia |
| 样式 | UnoCSS (原子化) + SCSS |

## 快速开始

```bash
# 安装依赖（推荐 pnpm）
pnpm install

# 启动开发服务器
pnpm dev

# 类型检查
pnpm type-check

# 构建生产包
pnpm build
```

## 目录结构

```
src/
├── components/       # 全局公共组件（自动注册）
├── views/            # 页面级组件
├── router/           # 路由配置
├── stores/           # Pinia 状态管理
├── styles/           # 全局样式
├── types/            # 类型声明（auto-imports.d.ts 等，自动生成）
├── App.vue           # 根组件
└── main.ts           # 应用入口
```

## 开发约定

- **自动导入**：Vue / Vue Router / Pinia 的 API 无需手动 `import`，直接使用 `ref`、`useRouter` 等即可。
- **组件自动注册**：`src/components/` 下的组件可直接在模板中使用，Element Plus 组件也已按需自动导入。
- **路径别名**：使用 `@/` 指向 `src/`。
- **UnoCSS 快捷类**：`flex-center`、`flex-between`、`card-base` 已在 `uno.config.ts` 预置。
