# 登录门 · zmzai cloud

`auth.zmzai.cloud` 是 ZMZ AI 产品线的单点登录服务。

它复用牧之账号体系的用户、session 和 cookie 规则，让 `zmzai.cloud`、`m.zmzai.cloud`、`z.zmzai.cloud`、`a.zmzai.cloud` 等子站共享同一套登录态。

## 职责

- 提供邮箱密码登录；
- 提供 GitHub OAuth 登录；
- 写入和清理跨子域 session cookie；
- 根据 `next` 参数把用户带回来源子站；
- 展示已登录用户和可进入的子站入口；
- 复用 `@zmzai/db` 的 User / Session / Account schema。

## 当前边界

- 注册入口仍由牧之知识体系承接；
- 账号禁用、角色和 session schema 以共享数据库模型为准；
- 这是 ZMZ AI 内部 SSO，不是通用身份平台。

## 目录

| 路径 | 说明 |
| --- | --- |
| `app/login/page.tsx` | 登录页，支持邮箱密码和 GitHub 登录 |
| `app/page.tsx` | 已登录后的子站入口 |
| `app/logout-button.tsx` | 退出登录 |
| `providers/auth/github.ts` | GitHub OAuth 流程 |
| `providers/auth/session.ts` | session 读取、校验和写入 |
| `providers/auth/redirect.ts` | 登录后跳转边界 |
| `config/env.ts` | 服务端环境变量校验 |

## 本地运行

```bash
pnpm install
pnpm dev
```

默认端口是 `3001`：

```bash
pnpm start
```

常用检查：

```bash
pnpm typecheck
```

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `APP_URL` | `http://localhost:3001` | 当前 auth 服务地址 |
| `MONGODB_URI` | 无 | 与牧之账号体系共用的 MongoDB |
| `AUTH_SECRET` | 无 | 必须与牧之一致，用于 session token hash |
| `SESSION_COOKIE_NAME` | `muzhi_session` | 登录态 cookie 名称 |
| `SESSION_COOKIE_DOMAIN` | 空 | 多子域共享登录时使用 |
| `SESSION_TTL_DAYS` | `30` | session 有效天数 |
| `GITHUB_CLIENT_ID` | 无 | GitHub OAuth App client id |
| `GITHUB_CLIENT_SECRET` | 无 | GitHub OAuth App secret |

## 相关仓库

- [`zmzai-db`](https://github.com/Ulanxx/zmzai-db)：User、Session、Account schema 的唯一来源；
- [`muzhi`](https://github.com/Ulanxx/muzhi)：注册和知识产品交付入口；
- [`zmzai-cloud`](https://github.com/Ulanxx/zmzai-cloud)：产品矩阵主站。

Apache-2.0 · 牧之
