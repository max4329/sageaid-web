# SageAI Admin Web

基于 **Vue 3 + JavaScript + Pinia + Element Plus** 的管理后台：

- 登录：`/login`
- 日志：`/logs`（对接 `POST /api/ai/logs/query` 与 `GET /api/ai/logs/:windowId/:handKey`）
- 入池率：`/players`（对接 `POST /api/players/query`）

## 本地开发

在仓库根目录下启动后端（默认 `http://localhost:3000`）：

- `admin-server` 有全局前缀 `api`，所以接口为 `/api/...`

启动前端：

```bash
cd admin-web
npm install
npm run dev
```

### API 代理与地址

默认通过 Vite 代理把 `/api` 转发到 `http://localhost:3000`（见 `vite.config.js`）。

如需自定义：

- 复制 `env.example` 的内容到你本地环境变量或自己的配置中
- 或直接设置环境变量 `VITE_PROXY_TARGET`（仅开发代理用）
- `VITE_API_BASE` 默认是 `/api`

## 生产构建

```bash
cd admin-web
npm run build
```

跑回归
npm run satelliteV4:regression