# 本地开发服务器 · 端口与启动命令

Status: current
Validity: current
Owner: Codex（操作指南；服务由对应任务Owner负责）
Last reviewed: 2026-11-02
Template: guide-runbook-v1 / 1.0.0

## 目的

从仓库根目录选择正确的engine、project和origin，复用已运行实例，区分日常开发、编辑器同源试玩、局域网文件访问与独立运行时。端口表来自当前package脚本；本文静态核命令，不证明服务此刻正在运行。

## 前置条件

- 先核[当前任务范围](../../tasks/board.md)和[协作流程](agent-workflow.md)，Reforge/编辑器工作另读[READ-FIRST](../../phase2/READ-FIRST.md)。启动前探测对应端口/进程，已有正确实例时复用；不要停掉其他Owner的进程。
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

操作记录应说明实际命令、端口/协议、engine/project、起停Owner、工程/资产来源与可达性。由[浏览器实测指南](browser-verification.md)继续核实际输入和画面；服务启动不替代功能、E2E、SW、视觉或coverage通过。2026-10-24的既有核验仅核package与Vite等源码，未启动或停用任何服务。


现行操作沿用此前已核正文，本次仅整理历史引用，未重新执行服务或浏览器验证。旧治理说明、原操作手册及当时证据可从[固定Git原件](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/guides/dev-servers.md)恢复；后续命令、caller或维护权改变时再核对应操作。
