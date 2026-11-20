# QUALITY-REFORGE-PRESENTATION-1 — Reforge 资源与呈现代码治理

Status: review
Phase: phase2
Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-20
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

先处理上一窗口的 review，再逐文件核查 Reforge 资源和呈现模块。对实际调用、状态归属、命名、可复用边界和测试判别力形成可独立复验的证据。

## 范围

沿用 `codex/code-quality-94-102` 隔离工作树，起点为 PR #72 合并提交 `b3f6104561d77ba270f08a3a7f4535aa63513350`。账本基点 3,772 tracked、1,247 closed、8 review、2,517 pending。Codex 持有当前代码治理切片的单一写入权。每次扩至下一切片前交叉核对活动分支已提交和未提交路径。

候选来自实际 pending，初选 97 个文件。音频 23，文本与对白 17，资源与启动 19，菜单 22，绘制与输入 16。各主体的最终完成状态取逐文件证据。首片为旁白和拾取提示共用卷轴几何。既有用户批准和风险卡按各自范围使用。

## 前提与证据

受 [代码质量八维](../../engineering/guides/code-quality.md)、[测试治理](../../testing/governance.md)和 [第二阶段开工规则](../../phase2/READ-FIRST.md)约束。原始 PAL 格式与当前二阶段资源、文本、运行所有权分别对照对应规范和生产入口。

| 上一窗口 review | 本轮核定的处置入口 |
|---|---|
| Editor 资产诊断、Content 物品夹具 | 活跃 E2E 尚未合入。原资产诊断按[既有卡](CONTENT-ASSET-RECORD-OWNERSHIP-1.md)继续等待。E2E 专测仍引用夹具。 |
| 地图转换及审计、精灵等价、旧商店扫描 | [原始地图字](MIGRATION-MAP-SOURCE-WORD-DOMAIN-1.md)、[精灵布局等价](MIGRATION-SPRITE-DEFINITION-OBJECT-ORDER-1.md)、[商店扫描](MIGRATION-STORE-COMMAND-SCAN-RETIREMENT-1.md)各自的原件和准入条件。 |
| 物品方案、素材重建 | [编号归属](MIGRATION-ITEM-SCHEME-ORDINAL-1.md)及[素材失败边界](MIGRATION-CHROME-BAKE-PREFLIGHT-1.md)的新增业务反例。 |

## 验收

按独立模块切片保存实际完整读域、caller、权威来源、八维、源码和测试合同去向、定向执行及必要失败。已有证据仍适用时复用，相关输入变化时复核。约百个主体实际达到验收条件后集中运行全仓检查、官方 coverage ratchet、lint-zero、账本及 PR 受保护 fast。验证、提交和远端检查按实际时点记账。

## 状态与交接

2026-11-20 确认 PR #72 主线双门与基线状态。原审查结论及已有红例来自 [上一窗口执行归档](../evidence/QUALITY-MIGRATION-SOURCE-PROJECTIONS-1.tar.gz)。已建立首片分工并确认当前代码候选与活跃 E2E 的产品及测试路径无交集。共享账本入口的文档差异在集成前另核。

### 上一窗口的 review

按用户批准收口六个 Migrate 原 review 文件。两个地图文件共享来源字校验，精灵布局比较忽略对象键顺序，编号 10 起的 PAL 方案继续要求真实物品根。退役缺生产消费者的商店计数，保留二十家源商店和炼化规则。`pnpm bake` 先完成生成、长度与摘要校验，并拒绝链接输出，随后才写入。原有资源和活跃 E2E 文件字节未改。

真实 PAL 发布组合定向 12 项通过，其中含早版 bake。最终 bake 命令 7 项通过。Migrate 迁移单元 96 项、路径邻接 25 项、Content 引用邻接 57 项、Reforge 光标邻接 5 项通过。涉及的 Migrate 与 Reforge typecheck 和改动路径静态检查零诊断。完整 stderr、早期失败、反例及逐文件八维以[唯一阶段证据](../evidence/QUALITY-REFORGE-PRESENTATION-1.tar.gz)为准。E2E 的两项继续 review，待其合入后核 Owner。

### 旁白与奖励卷轴

三个原 pending 文件逐项完成。旁白与拾取共用横向卷轴几何，仍各自持有纵坐标和绘制样式。重构前后都是 3 文件、14 项通过，包含既有实际 Canvas 像素和旁白显示合同。全仓检查、官方覆盖率及远端 protected fast 留到稳定的大批收尾。

### 对白关闭生命周期专测

`dialog-box.glm-large-wave.test.ts` 的原两例归 `dialog-box.lifecycle.test.ts`。旧用例检查 Canvas 调用序列是否含字符串“TOP”，原 oracle 无法把实际旧槽状态或像素辨认出来。现用例核两槽已可见、关闭立刻清空、重开只在新槽坐标绘制，以及关闭后继续推进和重绘无提交。隔离反控只移除 `DialogBox.close` 的绘制态清理，两条原例仍绿，新例的残留槽断言单红。恢复候选后 4 文件 15 项通过。测试职责及反控在唯一阶段证据。两个 E2E 所持的原生产实现和观察专测未写入。

### 本窗口八维验收

原定 97 个 pending 全数完成八维读核，84 个验收，13 个保留 review。分别为资源和启动 15/4、音频 20/3、绘制和输入 15/1、文本和对白 15/2、菜单 19/3。测试按生产职责拆合。旧路径与后继的合同在唯一证据中逐项映射，后继路径数不再计入原主体数。候选账本 3,777 个 tracked，1,343 closed，15 review，2,419 pending。15 包含本窗口 13 个及上一窗口两项 E2E 持有。存量测试证据按各自版本和适用范围继续引用。

| 领域 | 核实与整改 |
|---|---|
| 资源和启动 | 只认实际登记的场景入口，氛围表按现有三个有限颜色通道和定义字段校验，画布准备或绘制失败释放已解码背景。分开实绘 PNG、精灵、gzip、场景投影和只读缓存测试；光标 JSON 解码的 282 字节与原 DATA.MKF 第 12 块逐字节一致。 |
| 音频 | SFX 扫描脚本、精灵及动作按真实登记读取，MIDI 预览读取新曲失败时报告该曲实际状态。BGM 恢复、MIDI 字节和浏览器端口生命周期归各自套件。真实文件读取及成功恢复使用不同字节和结果。 |
| 文本和对白 | 实际字形宽度逐段折行。字形缓存以字形身份持有，实际像素证明旧字体缓存不能串到新字体。显示和计时都按 Unicode 码点推进，新红例使用实际对白行。 |
| 菜单 | 缺失物品不能进入购买确认，合法同名仍可购买。左右方框、数字、级联、状态和购买输入各有职责测试。核对旧文字顺序和空卷轴的分配边界。 |
| 绘制和输入 | Canvas 缩放、采样、透明度异常退出恢复到调用者状态。对比真实画布像素、原生键盘事件、解码帧实际范围和时钟重锚。 |

用户授权的三个查表入口、三项资源及音频问题、对白计时分别有正式失败和修复后的定向结果。以工程 author 合同、现行 loader/renderer 和测试的独立字节、颜色、时序为判定源。测试迁移先列 391 个原生旧身份，旧名缺失和后继不可达均为 0。Reforge 集成定向 409 项通过，Editor 音频与氛围相邻 14 项通过。Q2 所用菜单源码恢复原字节后，菜单与相邻 153 项通过。各次通过执行的 stderr 均为空。早期菜单组合运行有一条 Canvas 用例超时。单文件复跑通过，超时与恢复分别保留。

本窗口以现有格式、原盘数据和运行合同为主，更新了任务卡和账本。已审批的输入拒绝、码点节奏和错误恢复落实在现用入口及测试。项目的字段、保存结构和作者操作指南没有新合同需要同步。测试生成的可观察数据都在隔离位置，正式数据文件和 E2E 实现路径未写入。

### 合并后关闭复核

按 #73 合并提交 `bfd5b5c4c179268a8dacedd42ac4adb651149652` 和原归档 `window/menu-review.json` 核对。原窗口的 84 个接受、13 个 review 是合并时点的记录。下列两项撤回关闭后，本窗口为 82 个接受、15 个 review。

| 路径 | 实际复核与解除条件 |
|---|---|
| `menu/item-use-session.ts` | `item-use-session.ts:3–25` 以 `#pending` 持有占用至 `finally`，`#controller` 在取消时先退出。菜单在 `menu-session.ts:316–320` 据占用拦截输入，世界清理在 `main.ts:5273` 发出取消。归档 G 维“一份控制器表达占用”与源码不符。须补足两个状态各自的生命周期与保留理由，再裁定 C/G。 |
| `menu/item-use-session.test.ts` | `item-use-session.test.ts:53–70` 先等待 B 完成，再取消 B。断言证明取消已结束的 B 不影响仍在途的 A。归档 B 维写反了取消对象，E 维未区分两种时序。真实菜单的在途占用与复用另有 `menu-session.test.ts:256–297` 支持。须核定实例隔离的实际合同，把标题和证据收至实测范围，或用同时在途的操作补足必要断言。该文件也是 [测试来源](../../testing/domains/runtime/menu/menu-session/report.md) 的绑定输入，改动时须同步核适用性。 |

按风险抽查紧邻三个窗口。#70 的 `audio-preview-session.test.ts` 在旧 owner 的停止回调内核对新旧身份，再核迟到释放与新 owner 保留。#71 的 `project-image-cache.test.ts` 在新旧请求同键重叠时让旧解码先完成，断言仍复用新 Promise，且仅关闭旧位图。两项结论与所读实现、调用和断言相符。#72 的 PAL 供应输入不变性证据范围过宽，具体断言及重新进入 review 的文件见 [迁移窗口复核](QUALITY-MIGRATION-SOURCE-PROJECTIONS-1.md#合并后关闭复核)。这次抽查按指定合同裁定。

### 留项与后继验证

| 当前路径 | 证据边界和接续条件 |
|---|---|
| `audio/sfx-readiness.ts` | 已修实际登记。正式场景投影的活动页与预取页有分歧，须在 E2E 释放 `main.ts` 后用双页合法工程复核宿主传参。 |
| `audio/sfx.ts`、`audio/midi-preview.ts` | SFX 非法预算仍能先申请上下文，待资源生命周期裁决。MIDI 旧时长已修，公开后端的闲置 `duration` 仍需接口判断。 |
| `assets.ts`、`project-loader.ts` | 异常位图、氛围与场景已修。调色板异常根合同、全图批读和解码出口留待受影响公共消费者确认。 |
| `startup-entry.ts`、`startup-entry.test.ts` | 已有真实菜单新局的 intro 正控，直达与读档的 intro 抑制尚缺真实宿主观察，且调用方部分归 E2E。 |
| `dialog/slot.ts`、`text/palette-color.ts` | 存量接口命名和测试专用字段退役须等待 E2E 的对白接线稳定。 |
| `gameplay-clock.ts` | 保留已有冻结、回退、重锚合同，首帧手动步进的等待锚点须用 RuntimeFrameSession 验实。 |
| `menu/menu-box.ts` | 现行 Q2 对照证据固定源码和行锚。源码按主线字节保留，职责专测仍独立接受。等 E2E 合同更新后接续消除未读槽标签和误导注释。 |
| `menu/reward-gain-queue.ts`、`menu/system-box.ts` | 奖励序列的重入可在直接入口复现，宿主是否可重入未证实。系统菜单空占位退役需先核 E2E 持有的会话入口。 |

中央资产诊断与 Content 物品夹具按用户此前裁决等活跃 E2E 合入。下一批先从独立、无需 E2E 入口改动的音频预算及公开出口核实际前提。若 E2E 已合入，优先复核实际活动页、对白槽及资产诊断的来源身份和真实 Owner。

### 证据恢复与统一门

[唯一窗口归档](../evidence/QUALITY-REFORGE-PRESENTATION-1.tar.gz)内 `window/window-manifest.json` 按原路径定位八维、当前文件、Git blob、调用方及留项。`window/README.md` 列恢复、反控和定向复跑入口。集中质量门的最终结果、首次拒绝及恢复身份取同一归档的 `window/gates.json`。GitHub 合并与主线运行以对应 PR 和提交为准。
