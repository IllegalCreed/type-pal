# 本地开发服务器 · 端口与启动命令

Status: current
Validity: current
Owner: Codex（操作指南；服务由对应任务Owner负责）
Last reviewed: 2026-10-24
Template: guide-runbook-v1 / 1.0.0

## 目的

从仓库根目录选择正确的engine、project和origin，复用已运行实例，区分日常开发、编辑器同源试玩、局域网文件访问与独立运行时。端口表来自当前package脚本；本文静态核命令，不证明服务此刻正在运行。

## 前置条件

- 先核[当前任务范围](../board.md)和[协作流程](../agent-workflow.md)，Reforge/编辑器工作另读[READ-FIRST](../../phase2/READ-FIRST.md)。启动前探测对应端口/进程，已有正确实例时复用；不要停掉其他Owner的进程。
- 完成仓库依赖安装。PAL原始资源和ignored物化目录由当前任务的供应责任管理；demo可用于自包含演示，不把缺PAL资产时启动demo当PAL验证。
- 当前package脚本显式传入端口和`--strictPort`。game Vite配置中仍有旧5173/5174与Playwright注释；当前6005入口以package脚本为准，不沿旧注释恢复已退役L2实例。未显式设PAL的脚本按应用默认选demo；若调用环境另设了`VITE_PROJECT_ID`，须核实际project身份。

## 步骤

### 1. 从根目录选定服务

| 目标 | 命令 | URL / 用途 |
|---|---|---|
| 一阶段game | `pnpm --filter @type-pal/game run dev` | `https://localhost:6005/`，默认basicSsl自签证书 |
| 一阶段HTTP开发 | `E2E=1 pnpm --filter @type-pal/game run dev` | `http://localhost:6005/`；该环境变量只关闭basicSsl插件 |
| 编辑器PAL | `pnpm --filter @type-pal/editor run dev` | `http://localhost:6010/`，脚本设置`VITE_PROJECT_ID=pal` |
| 编辑器demo | `pnpm --filter @type-pal/editor run dev:demo` | `http://localhost:6011/` |
| Reforge demo | `pnpm --filter @type-pal/reforge run dev` | `http://localhost:6050/` |
| Reforge PAL | `pnpm --filter @type-pal/reforge run dev:pal` | `http://localhost:6051/`，脚本设置`VITE_PROJECT_ID=pal` |

当前game没有`e2e` package脚本或6001专用实例；`E2E=1`本身不运行Playwright、剧情、Service Worker或离线验收。真实E2E执行使用[现行合同](../../testing/e2e/contract.md)对应命令。

### 2. 区分工程正文与资产供应

`data/raw/`是原版输入，`pnpm extract`生成一阶段提取数据。PAL当前场景/脚本等作者正文维护权按READ-FIRST与作者真源裁决，不因缺图片就重建或覆盖整份作者工程。

若任务要求核当前PAL publication或补齐ignored二进制，先确认原始资源、current baseline、供应分区和任务IO范围。当前命令启动时会先恢复待处理事务：不带`--write`也可能因journal恢复而写盘，不能当作严格只读探测。没有待恢复事务时才进入仅构建/验证计划的路径：

```bash
pnpm --filter @type-pal/migrate run migrate:content
# 核对计划；任务允许发布写盘时：
pnpm --filter @type-pal/migrate run migrate:content --write
```

`projects/pal/assets/index.json`是入库索引；`assets/migrated/`、`runtime/`可有未物化的ignored产物。不带`--write`不等于已物化；`--write`会将当前content、assets与baseline作为可恢复事务发布，不是只写图片。缺current baseline时命令拒绝，不从旧工程bootstrap；不要为首次clone自行复活旧epoch流程。`bake`只重建bundler-owned默认UI等，不是补PAL工程缺图的替代命令。`data/baked/`不作为当前项目或引擎输入。

### 3. 本地编辑与同源试玩

从编辑器“引擎试玩”打开同源play页，保留当前工程来源与句柄。协议、主机名和端口的任何变化都会改变origin；不能把另一个端口中缺少“最近工程”句柄当作数据丢失。独立6051与编辑器6010的用途不同。

### 4. 局域网需要文件夹读写时

普通`http://<局域网IP>:6010`不等同localhost的开发期安全来源。当前提供专门命令：

```bash
pnpm --filter @type-pal/editor run dev:lan
```

该脚本启用`EDITOR_LAN_HTTPS=1`、绑定`0.0.0.0:6010`，由editor Vite配置挂basicSsl。使用`https://<编辑器电脑的局域网IP>:6010/`；自签证书只用于可信开发网络，首次按本机浏览器流程处理。切换origin后重新选择工程文件夹。LAN模式会暴露开发源码/资源；多人长期使用应配置客户端信任的开发证书。

## 失败处理

- `strictPort`报占用：核现有实例的Owner、engine与project，正确则复用；未知实例先联系其Owner，不改端口绕开冲突。
- 页面仍在但请求`Failed to fetch`：核服务是否已退出/休眠中断，再核请求origin；保留原错误，不只凭旧SPA画面认定服务正常。
- 索引存在但PAL二进制404：核实际资产路径和物化计划；`bake`或dry-run均不等于物化成功。
- 显示demo却预期PAL：核是否使用指定`dev`/`dev:pal`脚本与project身份，尤其手写裸`vite`命令时。
- 局域网缺文件API：核HTTPS、安全上下文、证书与origin；缺权限、缺资产来源或任务范围外写盘时停止对应验证，不改产品/版本合同凑通过。

## 完成定义

操作记录应说明实际命令、端口/协议、engine/project、起停Owner、工程/资产来源与可达性。由[浏览器实测指南](browser-verification.md)继续核实际输入和画面；服务启动不替代功能、E2E、SW、视觉或coverage通过。本轮仅核package与Vite等源码，未启动或停用任何服务。

## 历史范围

下方保留`f4c664a8cf0dd564f68857b393861f553e35c73f`的旧端口/供应说明与2026-07-04决策。R35把现行指南标为historical并写入通用三步，无法支撑CLAUDE的当前启动路由；本次按真实脚本恢复具体操作正文，旧封套由Git保存。

## 原始结论

原稿明确6005/6010/6011/6050/6051、strictPort、PAL/demo区分、LAN HTTPS与ignored资产供应。旧默认端口或旧Playwright注释的存在不恢复旧测试入口。原稿“只跑dry-run不会写”的早期简写不能覆盖当前启动先恢复journal的真实调用顺序。

## 当时证据

原稿命令不是本轮运行回执。本次全文读本页及固定原源，核三package脚本、game/editor Vite相关段、migrate package命令、publication入口/恢复顺序、bake输出与当前维护权规范；未install/extract/migrate、未浏览器执行、未跑产品测试。

## 当前有效性

current指当前package脚本与静态核实的配置说明。实际端口占用、资产可达性、浏览器API和SW行为仍须在指定现场验证；脚本或供应维护权变化须同步本页。

## 继任文档

本页取代R35泛化正文；[CLAUDE](../../../CLAUDE.md)继续引用本页为端口速查，[READ-FIRST](../../phase2/READ-FIRST.md)定义供应维护权，[E2E合同](../../testing/e2e/contract.md)与实际任务保存执行结果。

## 原文保全

固定source revision `f4c664a8cf0dd564f68857b393861f553e35c73f`、SHA `448edbe18ae46164d0f81b6094ca453dabf25f1fdeeae23afee14651c787b368`。下方marker到文件末尾字节保留。

<!-- original-source-quote:start -->
> # 本地开发服务器 · 端口与启动命令
>
> > 端口规划(2026-07-04 拍板):**避开 vite 默认 517x 段**(容器/其他工程常撞)。
> > game 用 **6005**(⚠ 原定 6000 是 Chrome unsafe port(X11 保留),`ERR_UNSAFE_PORT` 拒开,2026-07-04 挪走)、编辑器从 **6010**、reforge 从 **6050** 起。
> > 端口已烤死进各包 `dev` 脚本(`--strictPort`:被占直接报错,不静默漂移到别的端口)。
> > 所有命令在**仓库根目录**执行,复制即用。
>
> ## 新人前置(clone 后必做)
>
> PAL 的原版输入放在 `data/raw/`，提取中间物在 `data/extracted/`；终态中二者都不是第二阶段
> 运行时资源目录（A7 已 catalog-only）。`projects/pal/assets/migrated/` 与 `runtime/` 不进 git，
> 须由 `migrate:content --write` 物化；`projects/pal/assets/index.json` 入库。首次跑通：
>
> ```bash
> # 原版仙剑游戏文件(MKF 全家 + PAL.EXE)放入 data/raw/(版权资产不进 git)
> pnpm install
> pnpm extract
> pnpm --filter @type-pal/migrate run migrate:content --write
>
> # 可选：确认同源再迁移已经稳定，无待写、待删或冲突
> pnpm --filter @type-pal/migrate run migrate:content
> ```
>
> `data/baked/` 已退役，不再是工程或引擎输入。`pnpm --filter @type-pal/migrate run bake` 只供维护者
> 重建 `packages/reforge/src/engine-chrome/assets/**` 的 bundler-owned 默认 UI、标题和对话光标；它不会
> 物化 PAL 工程资源，也不应作为缺工程图片时的修复命令。
>
> 没有原版资产时可先跑 demo 工程(自包含,不依赖上述产物):editor `dev:demo`(6011)/ reforge `dev`(6050)。
>
> ## 一阶段 · 仙剑本体(game)
>
> | 端口 | 用途 |
> |---|---|
> | **6005** | 日常 dev(6000 被 Chrome 拉黑,勿用) |
>
> ```bash
> pnpm --filter @type-pal/game run dev
> ```
>
> - 打开 <http://localhost:6005/>(basic-ssl 下实际是 `https://`,证书自签点信任即可)。
> - 需要 HTTP 开发入口（不挂 `basicSsl()`）时用 `E2E=1`:
>
> ```bash
> E2E=1 pnpm --filter @type-pal/game run dev
> ```
>
> 第一阶段 Playwright L2 已退役，当前没有 `game` 的 `e2e` 脚本或 6001 专用实例；`E2E=1` 只切到上述
> HTTP 开发入口，不是测试真 Service Worker 的路径，也不是 Playwright 入口。
>
> ## 二阶段 · 编辑器(editor)
>
> | 端口 | 用途 |
> |---|---|
> | **6010** | 日常 dev(**默认 pal 工程**,`VITE_PROJECT_ID=pal` 已烤进脚本,不用手带) |
> | 6011 | demo 工程(引擎冒烟/教学样例用) |
>
> ```bash
> pnpm --filter @type-pal/editor run dev
> ```
>
> 打开 <http://localhost:6010/>。demo 版:
>
> ```bash
> pnpm --filter @type-pal/editor run dev:demo
> ```
>
> 需要从另一台设备通过局域网 IP 使用文件夹读写时，不能使用 `http://<IP>:6010`：Chrome 只把
> localhost/loopback 的 HTTP 当作开发期安全来源，普通 IP 必须走 HTTPS。使用专门的 LAN 模式：
>
> ```bash
> pnpm --filter @type-pal/editor run dev:lan
> ```
>
> 然后打开 `https://<运行编辑器电脑的局域网IP>:6010/`。该命令使用开发期自签证书，首次访问需在浏览器高级设置中
> 继续（只应在可信局域网操作）；长期或多人使用应换成包含该 IP/稳定 DNS SAN 且客户端信任的正式开发证书。协议、主机名或端口变化会形成
> 新的浏览器 origin，localhost 下保存的“最近工程”句柄不会迁移，首次需重新选择工程文件夹。`dev:lan` 会把
> 源码及开发资源暴露给同一局域网，只能在可信网络使用。
>
> ## 二阶段 · 新引擎(reforge)
>
> | 端口 | 用途 |
> |---|---|
> | 6050 | demo 工程(鬼界民居) |
> | **6051** | **pal 工程**(仙剑迁移内容,日常验证用这个) |
>
> ```bash
> pnpm --filter @type-pal/reforge run dev:pal
> ```
>
> 打开 <http://localhost:6051/>(dev 直达某场景:`?scene=s001`)。demo 版:
>
> ```bash
> pnpm --filter @type-pal/reforge run dev
> ```
>
> ## 常见坑
>
> - **页面在但接口全挂(Failed to fetch)**= dev server 已死、浏览器里是残留 SPA。重跑上面的命令再刷新即可(server 跨夜/休眠常被系统回收)。
> - **`assets/index.json` 有记录但 `projects/pal/assets/migrated/` 或 `runtime/` 404** = ignored 二进制尚未物化。运行
>   `pnpm --filter @type-pal/migrate run migrate:content --write`；只跑 dry-run 或 `bake` 都不会写 PAL 工程。
> - **`VITE_PROJECT_ID` 忘带** → 加载 demo 工程(鬼界民居)而非仙剑。日常脚本已烤死不用管;只有手写 `vite` 裸命令时才需要。
> - **strictPort 报"端口被占"** = 该服务已有实例在跑,直接用现成的,别再起一个。
> - Claude 起验证实例时**直接复用本表脚本/端口**(先探测端口,活着就复用),不再另开临时端口。

<!-- original-source-quote:end -->
