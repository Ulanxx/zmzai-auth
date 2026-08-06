# zmzai cloud 单点登录（SSO）+ 香港迁移 — 技术设计文档

> zmzai cloud 产品矩阵的统一认证中心 `auth.zmzai.cloud`，及把各子域应用
> 迁到香港服务器的方案。状态：设计稿 v1，2026-08-06。
>
> 决策记录（用户已确认）：
> - SSO 机制：**父域 cookie**（`.zmzai.cloud`），不用 JWT redirect
> - SSO 中心：**新建独立 auth 应用**（本仓 `zmzai-auth`）
> - 迁移范围：**muzhi + 中转驿 + auth 全迁香港服务器**

---

## 0. 解决的两个问题

1. **登录太麻烦**：目前每个子域各自登录。要做"一次登录、全子域通、未登录
   自动跳统一登录页、登录后跳回来"。
2. **登录/响应太慢**：实测 muzhi 登录接口 2-18s（首次 18.5s 冷启动）。
   **根因不是 MongoDB Atlas 慢**（Atlas ping 1.5s 正常），而是：
   - **Vercel serverless 冷启动**（首次 18.5s 是典型冷启动）
   - **网络链路**：国内用户 → Vercel 美东边缘 → Atlas（可能在国外），叠加高
   - **bcrypt 密码哈希**在 serverless 上 CPU 受限更慢

   **解法：迁香港服务器**——常驻进程无冷启动，香港对国内用户和上游中转站
   （多在内地/香港）延迟都低。

## 1. SSO 架构（父域 cookie 方案）

```
                ┌──────────────────────────────────┐
                │   香港服务器（常驻 Node）            │
                │  auth.zmzai.cloud  ← SSO 认证中心   │
                │   ├─ GET  /login   统一登录页        │
                │   ├─ POST /login   校验密码→建session│
                │   │      → 种 domain=.zmzai.cloud   │
                │   │        cookie → redirect next   │
                │   ├─ GET  /logout  清 session       │
                │   └─ GET  /me      返回当前用户      │
                └──────────────────────────────────┘
                          │ 共享
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
  muzhi.zmzai.cloud   m.zmzai.cloud    z/a/i.zmzai.cloud
  （读同一 cookie      （中转驿）        （各子域）
   + 同一 Session 表）

流程（以访问中转驿为例）：
1. 浏览器 GET m.zmzai.cloud/dashboard
2. 中转驿检查 muzhi_session cookie → 无 → redirect
   auth.zmzai.cloud/login?next=https://m.zmzai.cloud/dashboard
3. 用户在 auth 登录页输密码 → auth 校验（查 User 表 + bcrypt）
   → 建 Session（写 Session 表）→ 种 domain=.zmzai.cloud cookie
   → redirect 回 next（https://m.zmzai.cloud/dashboard）
4. 中转驿再收到请求，带父域 cookie → 查 Session 表 → 识别用户 → 进入
```

**核心**：所有子域读**同一个** `muzhi_session` cookie + **同一个** MongoDB
Session/User 表 + **同一个** AUTH_SECRET。SSO 中心只是把"登录页 + session
签发"集中到 auth.zmzai.cloud，各子域的鉴权逻辑（读 cookie 查 Session）不变。

## 2. 为什么父域 cookie 而不是 JWT

你已有父域 cookie 基础（muzhi 已设 `SESSION_COOKIE_DOMAIN=.zmzai.cloud`）。
继续用它：

- ✅ 各子域**不用改鉴权代码**（中转驿的 `getCurrentUser` 已经读 cookie 查
  Session 表，直接用）
- ✅ 无 token 传递/过期/刷新复杂度
- ✅ 注销简单（删 Session 表记录，全子域立即失效）
- △ 只适用于同一父域 `*.zmzai.cloud`（你的场景正好全是）

JWT redirect 适合跨完全不同的域（a.com ↔ b.com），你不需要，不引入。

## 3. auth 应用（zmzai-auth 仓）职责

只做认证，不做业务：

| 路由 | 作用 |
|---|---|
| `GET /login?next=...` | 统一登录页（zmzai 品牌：印泥红 + 衬线 + 印章） |
| `POST /api/login` | 校验邮箱+密码（查 User 表 + bcrypt）→ 建 Session → 种父域 cookie → 返回 next |
| `POST /api/logout` | 删 Session → 清 cookie |
| `GET /api/me` | 返回当前登录用户（供各子域/前端查） |
| `GET /` | 已登录→显示用户 + 各子域入口；未登录→跳 /login |

**复用 muzhi 的**：User/Session 镜像模型（读同库）、`hashToken`（同
AUTH_SECRET）、`getCurrentUser` 逻辑、bcrypt 密码校验、zmzai 品牌组件。

**用户数据不动**：User/Session 表还在原 MongoDB Atlas（`muzhi_production`
库），auth 应用读同一个库。注册/改密码仍由 muzhi 负责（v1 auth 只做登录，
注册跳 muzhi/register）。

## 4. 各子域接 SSO redirect

每个子域在"未登录"时，不再显示自己的登录链接，而是 redirect 到 auth：

```
未登录 → 302 auth.zmzai.cloud/login?next=<当前完整 URL>
```

要改的子域：
- **中转驿**（zmzai-relay）：`getCurrentUser` 返回 null 时，页面 redirect 到
  auth `/login?next=...`；API 仍返回 401（API 不 redirect，由调用方处理）。
- **muzhi**：muzhi 自己的登录页可以保留（它就是业务站），但也把"登录"链接
  统一指向 auth，或 muzhi 直接用 auth 登录页（v1  muzhi 登录页保留，auth
  作为统一入口给其它子域用）。
- **z/a/i 骨架**：后续接入时同样 redirect 到 auth。

`next` 参数必须校验：只允许 `*.zmzai.cloud` 域，防开放重定向漏洞。

## 5. 迁移到香港服务器

### 5.1 迁移哪些

| 应用 | 当前 | 迁到 | 域名 |
|---|---|---|---|
| auth（SSO） | 新建 | 香港服务器 | auth.zmzai.cloud |
| 中转驿 relay | Vercel | 香港服务器 | m.zmzai.cloud |
| muzhi | Vercel | 香港服务器（**可选，见下**） | muzhi.zmzai.cloud |
| hub | Vercel | 留 Vercel（纯静态，无需迁） | zmzai.cloud |
| z/a/i 骨架 | Vercel | 暂留 Vercel | z/a/i.zmzai.cloud |

**muzhi 是否迁**：muzhi 是最复杂的（视频/OSS/支付/邮件），迁移成本高。
建议**先迁 auth + 中转驿**（它们最受益：auth 登录慢、中转驿接便宜中转站
要低延迟），muzhi 留 Vercel 先跑，后续再定。hub 纯静态留 Vercel 即可。

### 5.2 香港服务器部署形态

每个 Next.js 应用一个常驻进程（PM2 管理），Caddy 反代 + TLS：

```
香港服务器
├─ Caddy :443
│   ├─ auth.zmzai.cloud → 127.0.0.1:3001 (auth)
│   ├─ m.zmzai.cloud    → 127.0.0.1:3002 (relay)
│   └─ muzhi.zmzai.cloud → 127.0.0.1:3003 (muzhi，若迁)
├─ PM2
│   ├─ auth   (next start -p 3001)
│   ├─ relay  (next start -p 3002)
│   └─ muzhi  (next start -p 3003，若迁)
└─ MongoDB：仍用 Atlas（不动，选香港/新加坡区域更近）
```

**MongoDB 不动**：还在 Atlas，只是应用从"Vercel 美东"迁到"香港服务器"后，
应用→Atlas 的延迟取决于 Atlas 区域。建议 Atlas 集群选**香港或新加坡**区域，
与应用同区域，进一步降延迟。无需迁移数据（同一 Atlas，只是应用位置变了）。

### 5.3 DNS 切换

- `auth.zmzai.cloud` A 记录 → 香港服务器 IP（新增）
- `m.zmzai.cloud` 从 Vercel（cname.vercel-dns.com）改 A 记录 → 香港服务器 IP
- `muzhi.zmzai.cloud` 若迁，同样改 A 记录

切换前先在服务器把应用跑通（用临时端口/ hosts 测试），再切 DNS，减少停机。

## 6. 安全

- `next` 参数白名单：只允许 `*.zmzai.cloud`，防开放重定向；
- AUTH_SECRET 所有应用一致（session token hash 用），单独保管；
- cookie `httpOnly + secure + sameSite=lax + domain=.zmzai.cloud`；
- 香港服务器：SSH 非标端口 + key 登录 + fail2ban + 防火墙只开 80/443；
- 登录接口限流（防爆破，复用 muzhi 的 rate-limit 模式）；
- bcrypt 密码哈希成本因子保持 muzhi 现状。

## 7. 里程碑

| 阶段 | 交付 |
|---|---|
| M1 auth 骨架 | zmzai-auth 应用：登录页 + /api/login + /api/logout + /api/me，复用 muzhi User/Session/bcrypt |
| M2 SSO 打通 | auth 种父域 cookie + redirect next（白名单校验），本地跑通 |
| M3 子域接入 | 中转驿未登录 redirect 到 auth；muzhi 登录入口指向 auth |
| M4 香港部署 | 服务器装 Node+PM2+Caddy，部署 auth + relay，绑 auth/m 子域 |
| M5 切 DNS | auth/m 子域切到香港，验证 SSO 全流程 + 速度 |
| M6 muzhi 迁移 | （可选/后续）muzhi 迁香港，全栈统一 |

## 8. 现状与下一步

已完成的基础：
- 父域 cookie：muzhi 已设 `SESSION_COOKIE_DOMAIN=.zmzai.cloud`
- 中转驿鉴权：已能读 muzhi Session/User（同库同 secret）
- 中转驿 API key 分配：Bearer key 模式已上线

下一步：M1 建 auth 应用骨架。复用 muzhi 的 User/Session 镜像模型 +
bcrypt 校验 + zmzai 品牌登录页。
