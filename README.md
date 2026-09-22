# Biz Export Platform

Vue3 业务组件「选择性导出售卖」平台。

用于解决这类场景：公司内部维护了一套 Vue3 业务组件库，需要按客户需求**只导出其中部分组件**打包交付，买方拿到包后能像普通 npm 包一样引入到自己的 Vue3 项目中使用。

---

## 这个框架是做什么的？

### 背景问题

传统做法要么把整个组件库全量发给客户（未购买的组件也会泄露），要么每次手动改入口文件再临时打包（慢、不稳定、难维护）。本框架采用 **「预构建 + 装配」** 方案：

1. **组件库 CI** 预先把每个组件打成独立制品，并生成 `components.manifest.json`（组件清单 + 依赖关系）
2. **管理后台** 勾选要卖的组件，系统自动计算依赖闭包（例如买了 `OrderTable`，会自动带上它依赖的 `Button`、`Pagination`）
3. **装配器** 从制品仓拷贝文件，生成客户专属 npm 包，打成 ZIP 供下载
4. **买方** 安装 ZIP 包，按需或全局注册组件即可使用

### 核心能力

| 能力 | 说明 |
|------|------|
| 选择性导出 | 勾选任意组件组合，不必全量交付 |
| 依赖闭包 | 自动补全运行时依赖，避免买方安装后缺组件报错 |
| 闭包预览 | 导出前展示「已选 / 实际打包」清单，减少商务纠纷 |
| 客户水印 | 包内写入 `WATERMARK.json`、`LICENSE`，记录客户、订单、指纹 |
| 下载鉴权 | 导出包通过令牌下载，支持吊销 |
| 订单历史 | 记录每次导出，支持重复下载 |

### 整体架构

```text
mock-component-library（示例组件库）
  │  CI 构建：每个组件独立 dist + components.manifest.json
  ▼
@biz/assembler（装配器 + biz-export CLI）
  │  读取 Manifest → 解析依赖闭包 → 拷贝制品 → 生成 package.json → 打 ZIP
  ▼
@biz/export-api（导出服务 API）
  │  组件列表 / 闭包预览 / 异步导出任务 / 下载令牌
  ▼
@biz/admin-web（组件管理页）
     勾选组件 → 预览闭包 → 提交导出 → 下载 ZIP
```

---

## 仓库结构

| 目录 / 包 | 说明 |
|-----------|------|
| `packages/mock-component-library` | 示例 Vue3 业务组件库，演示如何产出 Manifest 与多入口制品 |
| `packages/assembler` | 装配器核心逻辑 + `biz-export` 命令行工具 |
| `packages/export-api` | Express 导出 API：任务队列、订单、下载鉴权 |
| `packages/admin-web` | Vue3 管理前端：组件勾选、闭包预览、导出历史 |
| `scripts/smoke-test.mjs` | 装配结果冒烟测试 |
| `scripts/api-test.mjs` | API 端到端测试 |

---

## 内部人员：如何运行

### 环境要求

- Node.js >= 18
- pnpm

### 安装与构建

```bash
pnpm install
pnpm build:lib          # 构建示例组件库 + 生成 manifest
pnpm build:assembler    # 构建装配器
pnpm build:api          # 构建 API
pnpm build:admin        # 构建管理页
pnpm smoke              # 运行冒烟测试
```

### 启动管理后台

```bash
pnpm dev:api    # API 服务，默认 http://localhost:8787
pnpm dev:admin  # 管理页，默认 http://localhost:5173
```

管理页通过 Vite 代理访问 API。默认管理 Token 为 `dev-admin-token`，通过请求头 `x-admin-token` 传递，可在 `.env` 中修改（参考 `.env.example`）。

> 若启动 API 时报 `EADDRINUSE :::8787`，说明 8787 端口已被占用，可先执行 `netstat -ano | findstr :8787` 找到进程并结束，或设置 `PORT=8788` 换端口启动。

### 管理页操作流程

1. 打开 http://localhost:5173
2. 在左侧勾选要导出的组件
3. 右侧查看**闭包预览**（实际会打进包的组件列表）
4. 填写客户名称、包名、版本等信息
5. 点击「生成定制包」，等待任务完成
6. 在「导出历史」中下载 ZIP

### CLI 导出（不经过管理页）

```bash
pnpm export:cli -- \
  --components OrderTable,UserCard \
  --out ./out/acme-kit \
  --zip \
  --name @acme/biz-kit \
  --customer "Acme Corp" \
  --order-id "order-001"
```

常用参数：

| 参数 | 说明 |
|------|------|
| `-c, --components` | 逗号分隔的组件名 |
| `-o, --out` | 输出目录 |
| `--zip` | 同时生成 ZIP |
| `-n, --name` | 输出包名 |
| `--customer` | 客户名称（写入水印） |
| `--preview-closure` | 仅预览依赖闭包，不出包 |

---

## 接入真实组件库

当前仓库内的 `mock-component-library` 是演示用的示例库。接入你们真实的 Vue3 业务组件库时：

1. **组件库侧改造**
   - 每个组件独立目录 + 独立入口（`src/components/Foo/index.ts`）
   - CI 按组件分别构建，产出 `dist/Foo/index.js`、`.d.ts`、`style.css`
   - CI 生成 `components.manifest.json`，声明每个组件的依赖、样式、peerDependencies

2. **修改导出平台配置**

   编辑 `packages/export-api/src/config.ts`：

   ```ts
   export const manifestPath = '/path/to/your-lib/components.manifest.json'
   export const libraryRoot = '/path/to/your-lib'
   ```

3. **重新构建并启动**即可在管理页看到真实组件列表。

---

## 客户如何导入使用

导出完成后，客户会拿到一个 ZIP 包（或通过下载链接获取）。解压后的目录结构大致如下：

```text
@acme/biz-kit/
├── package.json
├── README.md           # 自动生成的接入说明
├── LICENSE             # 授权信息
├── WATERMARK.json      # 客户水印（订单号、指纹等）
└── dist/
    ├── index.js        # 统一入口（含 install 插件）
    ├── index.d.ts      # TypeScript 类型
    ├── index.css       # 汇总样式入口
    ├── Button/
    ├── OrderTable/
    ├── shared/         # 公共工具（若闭包需要）
    └── theme/          # 主题 token（若闭包需要）
```

更详细的买方接入说明见：[docs/客户接入指南.md](docs/客户接入指南.md)

---

## 商业化说明

- 每个导出订单生成唯一 **fingerprint**（指纹），同一组合 + 同一组件库构建号可复现
- 下载链接带 **token**，默认 7 天有效，可在管理页吊销
- 包内 **WATERMARK.json** 记录客户 ID、订单号、选中/实际组件列表，便于溯源
- `vue` 等框架依赖作为 **peerDependencies**，不打进包内，由买方项目自行安装

---

## 许可证

本项目代码仅供内部 / 演示使用。通过本平台导出的组件包，其授权条款以包内 `LICENSE` 文件为准。
