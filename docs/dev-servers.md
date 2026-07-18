# 本地开发服务器 · 端口与启动命令

> 端口规划(2026-07-04 拍板):**避开 vite 默认 517x 段**(容器/其他工程常撞)。
> game 用 **6005**(⚠ 原定 6000 是 Chrome unsafe port(X11 保留),`ERR_UNSAFE_PORT` 拒开,2026-07-04 挪走)、编辑器从 **6010**、reforge 从 **6050** 起。
> 端口已烤死进各包 `dev` 脚本(`--strictPort`:被占直接报错,不静默漂移到别的端口)。
> 所有命令在**仓库根目录**执行,复制即用。

## 新人前置(clone 后必做)

PAL 的原版输入放在 `data/raw/`，提取中间物在 `data/extracted/`；终态中二者都不是第二阶段工程的
运行时资源目录（A7-4 前仍有五个 legacy family 过渡读取 extracted）。`projects/pal/assets/**` 也不进 git，
但必须由迁移器确定性物化。首次跑通：

```bash
# 原版仙剑游戏文件(MKF 全家 + PAL.EXE)放入 data/raw/(版权资产不进 git)
pnpm install
pnpm extract
pnpm --filter @type-pal/migrate run migrate:content -- --write

# 可选：确认同源再迁移已经稳定，无待写、待删或冲突
pnpm --filter @type-pal/migrate run migrate:content
```

`data/baked/` 已退役，不再是工程或引擎输入。`pnpm --filter @type-pal/migrate run bake` 只供维护者
重建 `packages/reforge/src/engine-chrome/assets/**` 的 bundler-owned 默认 UI、标题和对话光标；它不会
物化 PAL 工程资源，也不应作为缺工程图片时的修复命令。

没有原版资产时可先跑 demo 工程(自包含,不依赖上述产物):editor `dev:demo`(6011)/ reforge `dev`(6050)。

## 一阶段 · 仙剑本体(game)

| 端口 | 用途 |
|---|---|
| **6005** | 日常 dev(6000 被 Chrome 拉黑,勿用) |
| **6001** | e2e 专用实例(playwright 自起自管,无需手动) |

```bash
pnpm --filter @type-pal/game run dev
```

- 打开 <http://localhost:6005/>(basic-ssl 下实际是 `https://`,证书自签点信任即可)。
- 要测**真 Service Worker** 时用 `E2E=1`(不挂 ssl 走 http):

```bash
E2E=1 pnpm --filter @type-pal/game run dev
```

- e2e(自动占 6001,和 dev 并行不冲突):

```bash
pnpm --filter @type-pal/game run e2e
```

## 二阶段 · 编辑器(editor)

| 端口 | 用途 |
|---|---|
| **6010** | 日常 dev(**默认 pal 工程**,`VITE_PROJECT_ID=pal` 已烤进脚本,不用手带) |
| 6011 | demo 工程(引擎冒烟/教学样例用) |

```bash
pnpm --filter @type-pal/editor run dev
```

打开 <http://localhost:6010/>。demo 版:

```bash
pnpm --filter @type-pal/editor run dev:demo
```

需要从另一台设备通过局域网 IP 使用文件夹读写时，不能使用 `http://<IP>:6010`：Chrome 只把
localhost/loopback 的 HTTP 当作开发期安全来源，普通 IP 必须走 HTTPS。使用专门的 LAN 模式：

```bash
pnpm --filter @type-pal/editor run dev:lan
```

然后打开 `https://<运行编辑器电脑的局域网IP>:6010/`。该命令使用开发期自签证书，首次访问需在浏览器高级设置中
继续（只应在可信局域网操作）；长期或多人使用应换成包含该 IP/稳定 DNS SAN 且客户端信任的正式开发证书。协议、主机名或端口变化会形成
新的浏览器 origin，localhost 下保存的“最近工程”句柄不会迁移，首次需重新选择工程文件夹。`dev:lan` 会把
源码及开发资源暴露给同一局域网，只能在可信网络使用。

## 二阶段 · 新引擎(reforge)

| 端口 | 用途 |
|---|---|
| 6050 | demo 工程(鬼界民居) |
| **6051** | **pal 工程**(仙剑迁移内容,日常验证用这个) |

```bash
pnpm --filter @type-pal/reforge run dev:pal
```

打开 <http://localhost:6051/>(dev 直达某场景:`?scene=s001`)。demo 版:

```bash
pnpm --filter @type-pal/reforge run dev
```

## 常见坑

- **页面在但接口全挂(Failed to fetch)**= dev server 已死、浏览器里是残留 SPA。重跑上面的命令再刷新即可(server 跨夜/休眠常被系统回收)。
- **`assets/index.json` 有记录但 `projects/pal/assets/**` 404** = ignored 二进制尚未物化。运行
  `pnpm --filter @type-pal/migrate run migrate:content -- --write`；只跑 dry-run 或 `bake` 都不会写 PAL 工程。
- **`VITE_PROJECT_ID` 忘带** → 加载 demo 工程(鬼界民居)而非仙剑。日常脚本已烤死不用管;只有手写 `vite` 裸命令时才需要。
- **strictPort 报"端口被占"** = 该服务已有实例在跑,直接用现成的,别再起一个。
- Claude 起验证实例时**直接复用本表脚本/端口**(先探测端口,活着就复用),不再另开临时端口。
