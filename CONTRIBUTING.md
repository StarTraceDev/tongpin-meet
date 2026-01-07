# 贡献指南

## 环境

- Node 22（`.nvmrc`），pnpm 11
- Docker（本地只需要 PostgreSQL；Redis / MinIO / LiveKit 可选）
- macOS / Linux 均可；Windows 建议 WSL2（桌面端打包在 Windows 原生执行）

```bash
pnpm install
docker compose up -d
cp server/.env.example server/.env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## 仓库结构

```
apps/web     会议 Web 端
apps/admin   运营管理台
apps/desktop 桌面端（main / preload / renderer）
server       NestJS（api / gateway / ai）
packages     shared 契约、tokens、theme、platform、config、app-core
```

跨端共享的类型、zod 契约、枚举、错误码、权限点一律放 `packages/shared`，不要在各端复制一份。

## 分支与提交

- 从 `main` 切分支：`feat/xxx`、`fix/xxx`、`docs/xxx`
- 提交信息：`<type>(<scope>): <emoji> <subject>`
  - type：`feat` `fix` `docs` `style` `refactor` `perf` `test` `build` `ci` `chore`
  - scope 必填，取 `web` `desktop` `admin` `app-core` `server` `shared` `platform` `tokens` `theme` `deps` `ci` `docs` `deploy`
  - 一个提交只做一件事；回滚会连带撤掉别的功能时就拆开
- 仓库的提交时间戳由 `docs/tools/commit.sh` 统一分配，**不要手写 `--date`**：

```bash
git add <本次文件>
docs/tools/commit.sh -m "feat(admin): ✨ 新增某功能"
```

## 提交前自查

1. `pnpm typecheck`、`pnpm lint`、`pnpm test` 全绿；改了界面再跑 `pnpm build`
2. 新逻辑有同名 `*.spec.ts`，覆盖分支而不是只跑通 happy path
3. 没有 `any`、`console.log`、`debugger`、注释掉的大段代码与未使用 import
4. 颜色/间距用 `@tongpin/tokens` 的 `--tp-*` 变量，不写死 hex 与 px 阴影
5. `git status` 只包含本次改动；`.env`、`dist`、`node_modules`、`docs/` 不入库
6. 界面改动附浅色/暗色/窄屏三张截图（管理台 375px，桌面端窗口最小尺寸）

## 冒烟测试

`pnpm test:e2e` 用 Playwright 的 request 客户端打真实接口，覆盖「登录 → 建会 → 入会 → 签到 → 结束」。前置条件：

```bash
docker compose up -d          # PostgreSQL
pnpm db:deploy && pnpm db:seed
pnpm --filter @tongpin/server build
node server/dist/apps/api/main.js &   # 或 pnpm --filter @tongpin/server dev
pnpm test:e2e
```

脚本读取 `E2E_BASE_URL`（默认 `http://127.0.0.1:3000`），使用 seed 里的两个账号，结束后软删本次会议。CI 的 `smoke` job 会自带 PostgreSQL 跑同一套用例。

## 数据库变更

- 改 `server/prisma/schema.prisma` 后运行 `pnpm db:migrate` 生成迁移，迁移文件一并提交
- 生产用 `pnpm db:deploy`；seed 必须可重复执行
- 查询与状态流转复用 `packages/shared` 的 `transitions`，不要在 service 里另写一套 if

## 权限与接口

- 新增管理接口要在 `packages/shared` 补响应 schema，并挂 `@RequirePermissions`
- 前端写操作用 `<Can perm="...">` 包住，路由用 `RequirePermission`
- 接口契约变更同步更新 `docs/04-接口契约.md`（文档不入库，但评审要看）

## Pull Request

- 描述里写清楚：改了什么、为什么、怎么验证（命令与截图）
- 关联 issue；破坏性变更单独标注
- CI 必须全绿；review 通过后 squash 合并
