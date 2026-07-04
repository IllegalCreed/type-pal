# 本地开发服务器 · 端口与启动命令

> 端口规划(2026-07-04 拍板):**避开 vite 默认 517x 段**(容器/其他工程常撞)。
> game 用 **6005**(⚠ 原定 6000 是 Chrome unsafe port(X11 保留),`ERR_UNSAFE_PORT` 拒开,2026-07-04 挪走)、编辑器从 **6010**、reforge 从 **6050** 起。
> 端口已烤死进各包 `dev` 脚本(`--strictPort`:被占直接报错,不静默漂移到别的端口)。
> 所有命令在**仓库根目录**执行,复制即用。

## 新人前置(clone 后必做)

`data/extracted/`(提取产物)与 `data/baked/`(RGBA 烤图)**不进 git、可再生**。缺它们时
引擎/编辑器会报「资产缺失/返回 HTML/DataView 越界」。首次跑通:

```bash
# 1. 原版仙剑游戏文件(MKF 全家 + PAL.EXE)放入 data/raw/(找同事拷,版权资产不进 git)
pnpm install
pnpm extract                                    # data/raw → data/extracted(几分钟)
pnpm --filter @type-pal/migrate run bake        # 烤 RGBA:UI 皮 + 立绘/头像/图标 → data/baked
```

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
- **`VITE_PROJECT_ID` 忘带** → 加载 demo 工程(鬼界民居)而非仙剑。日常脚本已烤死不用管;只有手写 `vite` 裸命令时才需要。
- **strictPort 报"端口被占"** = 该服务已有实例在跑,直接用现成的,别再起一个。
- Claude 起验证实例时**直接复用本表脚本/端口**(先探测端口,活着就复用),不再另开临时端口。
