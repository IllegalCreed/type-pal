# 全仓代码质量治理总纲

基点：`b9ba7e0faadf56519da024c0343f5b44b9a5c447`（`origin/main`，2026-10-04）。
本文件是 CODE-QUALITY-1 的治理路线与证据入口，不是“全仓已审完”声明；逐文件机器清单由
[`scripts/quality/code-quality-inventory.mjs`](../../../scripts/quality/code-quality-inventory.mjs)按基点生成，
使用 `node scripts/quality/code-quality-inventory.mjs --out=/tmp/type-pal-code-quality-inventory.json` 获取完整 JSON，
不把机器快照当作产品源文件提交。
已经直接核验的文件另记在[逐文件代码治理账本](code-quality-file-ledger.md)；账本未清零前不得宣布专项完成。

## 边界与当前责任

本专项按工程 → 模块 → 功能 → 文件推进，Coding Owner 为 Codex，单批单一写入者；不接管
`TEST-COVERAGE85-*`、`E2E-*` 或测试文档线程，不重领 `architecture-debt.md` 已完成的 13 批架构拆分。
生产行为、公共 API、schema/save、生成物和用户可见形态默认保持不变；若一手证据证明必须改变，另开产品/高风险卡。

`docs/ops/archive/tasks/done/CODE-QUALITY-1-governance.md` 记录本轮范围、前提真值门、首批白名单和验收；本文件只写已经
核实的治理路线，未知职责与候选问题保留为“待核”，不从行数、`any`、重复片段或静态图直接推出缺陷。

## 工程 / 模块 / 功能地图

| 工程 | 模块 | 功能面 | 公开出口 / 生产 caller 形态 | 状态所有权与质量审计重点 | 当前 Owner / 决定 |
|---|---|---|---|---|---|
| 第一阶段 | `@type-pal/shared` | MKF/RLE/YJ2/RNG 编解码、资源与输入类型 | 根 barrel `packages/shared/src/index.ts`；game、pal-extract、migrate、reforge 直接消费 | 纯字节解码器；检查游标进度、边界、错误传播、透明度不变量，不能把测试 fixture 当生产输入 | Codex；首批 RLE 边界，需修 |
| 第一阶段 | `@type-pal/pal-extract` | 原始 MKF/事件/资源解析与 CLI 写出 | `src/cli.ts` 及各 parser；调用 shared 纯 codec | IO、纯解析、写盘职责与失败策略；不改 `data/raw` 或提取产物 | Codex；待核 |
| 第一阶段 | `@type-pal/game` | shell 启动、事件/战斗/地图、呈现和资源加载 | Vite app；`assets/`、`core/`、`present/`、`shell/` | 机制真值、状态生命周期、取消/清理、资源失败降级；不得把静态计数当债 | Codex；待核 |
| 第二阶段 | `@type-pal/content` | canonical 内容类型、作者校验、引用闭包 | `src/index.ts` 与各领域类型/validator | schema 所有权、稳定 ID、验证层与运行时层方向；不主动改 content20 | Codex；待核 |
| 第二阶段 | `@type-pal/migrate` | 迁移纯函数、源规划、写保护与 PAL 供给 | `src/`、`scripts/migrate-content.mts`、`scripts/bake-assets.mts` | 上游真源、幂等、事务/写盘边界；不单点改 `projects/pal` | Codex；待核，保留已收口 PAL supply 边界 |
| 第二阶段 | `@type-pal/reforge` | 新运行时 main、world、battle、script、assets、author IO | `src/index.ts` 及 `author-io`/`entity-action-player`/`script-compiler-core` | READ-FIRST 架构优先、稳定 ID、显式状态所有权、取消/资源释放；不把一阶段代码结构搬回去 | Codex；待核，不重领 A1–F2 |
| 第二阶段 | `@type-pal/editor` | React App、工作区会话、命令/表单、设计系统与工具脚本 | Vite app、`src/core`/`src/ui`、`scripts/design-system-audit*` | UI 状态与 IO/纯规则分层、异步竞态、焦点/可访问性、公共命令边界；不夹带 UI 形态变更 | Codex；待核 |
| 工具 | `scripts` | quality/docs/coverage/script-governance/E2E 工具 | package scripts 与 Node CLI | 子进程、临时目录、失败/取消/清理、确定性；E2E 文件与文档当前不占用 | Codex；质量工具可审，E2E 保持隔离 |

## 机器清单口径

生成器以 Git 追踪树为输入，只扫描 `packages/{content,editor,game,migrate,pal-extract,reforge,shared}` 与 `scripts`，
记录路径、category、domain/module/feature、行数、公开出口、静态直接依赖与反向 caller，并预留
`stateOwnership/qualityIssues/evidence/risk/decision/status/verification` 字段。生产 callers 排除 test/fixture；
静态关系只是取证入口，不等同完整运行时调用图。

基点清单当前为 2,962 个记录：

| category | 文件数 | 解释 |
|---|---:|---|
| product | 772 | 包内生产 TypeScript/TSX/MTS/MJS 与工具生产代码 |
| test | 1,744 | `*.test.*` / `__tests__`，只作为合同与 caller 证据，不把数量当质量 |
| fixture | 9 | 独立测试输入/构造器 |
| generated | 356 | baselines、oracle、adoption/evidence 等机器产物；不直接改 |
| tool | 81 | `scripts` 非测试工具；E2E 工具在本轮只登记不修改 |

以上统计由 `node scripts/quality/code-quality-inventory.mjs` 生成；
重新生成后 `base` 必须与审计基点一致，若基点变化需在卡内记录 revision。所有记录初始为 `待核`，首批完成后
只把有直接 caller/oracle/验证证据的文件改为 `已验证`，未知候选不能自动删除或标成无问题。

## 问题优先级与停止线

### P0：安全/确定性/硬门

只收有直接执行证据的问题：无限循环、越界/未定义输入、未处理 Promise、资源/临时目录泄漏、共享状态竞态、
lint/typecheck/格式非零诊断。修复必须给出 before/after、生产 caller、失败 oracle 和相邻回归；不得用 ignore、
强转、缩小扫描范围或降低规则过门。

### P1：职责与公共边界

收状态/IO/纯逻辑/呈现 ownership 混杂、反向依赖、隐式全局、过宽 RuntimeContext、公共出口不清晰或失败策略
由相邻层吞掉的问题。只在调用关系和生命周期证据齐全时拆分；不以“文件变小”作为验收。

### P2：合同可读性与可维护性

收会误导维护者的过时注释、模糊业务命名、布尔模式参数、重复防御和与业务合同不一致的复用。改名/公共出口
必须全量更新 caller，并评估测试身份保护；纯表面注释不计整改。

### P3：死代码/历史兼容/低价值复杂度

只有生产 caller、输入域和替代证据均证明后才删除；开发期旧版本 fallback/upgrader 默认退役，除非任务卡列出
无法重建的真实输入、唯一调用者、删除条件和用户批准。未知项留 `待核`，不为凑数量改代码。

任何发现 schema/save/migration/asset pipeline、第一阶段机制真值、用户可见 UI/玩法或生成物影响时，立即停线，
升级高风险卡并重新过前提真值门。

## 有限批次与文件所有权

| 批次 | 白名单 | 目标 | 当前状态 |
|---|---|---|---|
| Q1 shared RLE safety | `packages/shared/src/rle.ts`、同域 RLE 回归 | generic framing 的截断/越界失败、strict sprite 零长 guard；合法像素/opaque 保真 | `done` |
| Q2 shared codecs/types | `shared/src/{mkf,yj2,rng,resources,tables}` 及必要 callers | MKF/RNG offset、payload、surface 边界已收；YJ2/resources/tables 留下一窄批 | `done`（MKF/RNG 子批）；不得把剩余 shared 领域视作已审完 |
| Q3 phase1 extract/game | `pal-extract` parsers/CLI、game assets/core/present/shell，分互斥子批 | Q3a 事件切分/标注类型边界已收；Q3b SSS/M.MSG 代码候选完成但受 CODE-QUALITY-3c editor coverage 单分支门阻塞；其它纯解析、CLI、game 资源/运行时仍待核 | `review/rework`，不得与覆盖率/E2E线程重叠 |
| Q4 phase2 content/migrate | content validators/types、migrate pure/IO 薄壳 | canonical schema、迁移源、事务/幂等边界；不改生成物 | `draft`，不得开始实现 |
| Q5 phase2 reforge/editor | reforge runtime、editor core/ui/tooling | 新架构 ownership、异步清理和公共出口；不重领13批 | `draft`，需要逐批准入 |
| Q6 scripts tools | quality/docs/script-governance 等非 E2E 工具 | 子进程/临时树/失败语义/确定性；E2E 留给其 Owner | `draft`，按 caller 另卡 |

同一文件同一时间只有 Codex 作为 Coding Owner；Q2–Q6 不能因为清单已生成就自动进入 build。每个批次闭合问题
清单后停止，跑定向/相邻测试、受影响 typecheck、Biome 零诊断，再按风险串行全仓 `pnpm check` → 官方 ratchet →
受保护 strict；不借测试候选或历史门替代独立验收。

## 首批结论（Q1 / Q1b）

`packages/shared/src/rle.ts:61-100` 对 header、source 游标、literal/透明段边界缺少显式失败；strict sprite container 的
`command === 0/0x80` 仍拒绝无像素进度命令。通用 `decodeRle` 则保留 PAL 帧 framing 中的 0/0x80 no-op，只要后续指令
能填满帧；源流耗尽或段越界时显式失败。真实 callers 为 game tileset/dialog 资源、pal-extract 资产导出和 reforge
资产加载；本批没有改变合法帧结果或资源格式。

Q1b 复核了 editor PAL project-reference census：`379304503` 将历史总数更新为 22,666，随后
`66676dc9f` 增加 `projects/pal` 场景状态字段后，当前 collector 的直接结果变为 22,663；同一漂移同步影响
blockers、behavior-reference edges、compact rows/target edges（4,353 / 4,448 / 25,196 / 28,092）。本批只更新
过期测试 oracle，不改 collector、项目内容或 UI。Q1/Q1b 的完整 check、官方 ratchet 和 protected fast 已通过；
这只关闭首批问题，不关闭 Q2–Q6，也不代表全仓逐文件治理完成。

Q2 的 MKF/RNG 子批已完成：真实 raw 的 2,373 个 chunks 与 1,464 个 RNG frames 通过新边界检查，完整 check、
official ratchet、protected fast 和 lint 全绿。剩余 YJ2、resources、tables 仍保持待核，下一批从 Q3 phase1
extract/game 开始。

验证完成前本节不标“已验证”；完整质量门与全仓逐文件治理仍未完成。
