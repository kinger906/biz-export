# Biz Export Platform

Vue3 业务组件「选择性导出售卖」平台：基于 **预构建制品 + Manifest 依赖闭包 + 装配出包** 的实现。

## 架构

```text
mock-component-library (CI 预构建 + manifest)
        ↓
   @biz/assembler (闭包解析 + 装配 ZIP)
        ↓
   @biz/export-api (任务队列 + 下载鉴权)
        ↓
   @biz/admin-web (组件管理页)
```

## 快速开始

```bash
pnpm install
pnpm build:lib
pnpm build:assembler
pnpm smoke
```

### CLI 导出

```bash
pnpm export:cli -- --components OrderTable --out ./out/acme-kit --zip --customer "Acme Corp"
```

### 启动管理后台

```bash
pnpm build:lib
pnpm build:assembler
pnpm dev:api
pnpm dev:admin
```

- 管理页：http://localhost:5173
- API：http://localhost:8787
- 管理 Token 默认：`dev-admin-token`（请求头 `x-admin-token`）

## 买方接入示例

```ts
import { createApp } from 'vue'
import { OrderTable, Button } from '@acme/biz-kit'
import '@acme/biz-kit/style.css'

const app = createApp(App)
app.component('OrderTable', OrderTable)
```

## 目录

| 包 | 说明 |
|---|---|
| `packages/mock-component-library` | 示例 Vue3 业务组件库 + `components.manifest.json` |
| `packages/assembler` | 装配器核心 + `biz-export` CLI |
| `packages/export-api` | 导出任务 API、订单、下载令牌 |
| `packages/admin-web` | 组件勾选、闭包预览、导出历史 |

## 商业化能力

- 订单记录与重复下载
- 包内 `WATERMARK.json` / `LICENSE` 客户水印
- 下载令牌（7 天有效，可吊销）
- 闭包预览，避免“只买 3 个却带 12 个”的争议

## 接入真实组件库

1. 在真实组件库 CI 中产出多入口 `dist/*` 与 `components.manifest.json`
2. 将 `export-api` 的 `manifestPath` / `libraryRoot` 指向真实制品路径
3. 管理页即可对真实组件做选择性导出
