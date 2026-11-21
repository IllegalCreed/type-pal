# QUALITY-REFORGE-PRESENTATION-1 — Reforge 资源与呈现代码治理

Status: review
Phase: phase2
Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-22
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

### Q2 后音频复审

2026-11-21 Codex build allowed。以已同步主线 `10378100a` 的同一治理树 `c749075e5` 为基点，任务限定现有 11 项留审。首片覆盖场景音效装配、预取收集、实际读档链回归；并独占 BGM、共用 Spessa 初始化及浏览器适配器专测。活跃 E2E 的未提交路径为一份剧情测试和四份作者内容，未占本片入口。

活动页由场景投影负责，预取应消费实际投影并保留 canonical 命令根。BGM 按既有 dispose 合同结束 worklet 与浏览器上下文的所有权。先用合法两层调用和真实平台入口留失败反例。主线来源引用依原固定片段核适用性，旧执行身份照原记录。全仓和官方覆盖率随稳定窗口。

本轮完成原 11 项中的八项。`sfx-readiness.ts`、`assets.ts`、`reward-gain-queue.ts`、`menu-box.ts`、`system-box.ts`、`startup-entry.ts` 和 `startup-entry.test.ts` 通过逐路径验收。`dialog/slot.ts` 的唯一消费者 DialogBox 接回槽位状态，迁移后的专测按绘制归属命名。红例分别证明存档选中页的音效错集、已接管和在途 Worklet 的未销毁、非法色彩根的错误边界，以及提示两条之间丢失提交权。其余是职责整理，保留真实标题新局、直达和标题读档的 intro 约束。

| 继续 review | 已完成与剩余条件 |
|---|---|
| `audio/bgm.ts` | Worklet 释放和关闭顺序已修。实际调用锁定的 SpessaSynth 4.3.6 构造后，`window.beforeunload` 仍登记一个原生 Sequencer 持有者。暂停后监听仍在，库无释放方法，需要上游合同或单独审查依赖处置。 |
| `audio/midi-preview.ts` | 试听共用初始化器已增加取消与所有权移交。仍使用同一 Sequencer，公开时长字段的退役也待用户裁定。 |
| `project-loader.ts` | 正式编辑器按需加载单图。全图批读仅测试及历史探针引用，包级出口待用户裁定，现有调用暂行。 |

原读域取本卡窗口归档，变更后的七项、退役项、三项余留与变更支持件取[执行归档](../evidence/QUALITY-POST-GAME-ACCEPTANCE-AUDIT-1.tar.gz) `review-11/`。两次相邻执行涵盖 38 个专测文件、235 个不同用例。首次在两个标题宿主用例报失败。标题测试改用真实菜单阶段与合法 intro 后，音频及启动 14 个文件 74 项复验均绿且 stderr 为空。首轮其余 24 个文件 161 项的保留证据按原身份恢复。类型与静态门取同目录执行清单。全仓产品 check、官方 ratchet 和 protected fast 待稳定批次，旧槽文件与改名测试在该次实测时刷新覆盖率基准。[已刊来源回执](../evidence/reforge-runtime-source-applicability.md)承接此前 E2E 的执行身份。账本实际状态以[机器清单](../audits/code-quality-file-ledger.md#当前状态)为准。

### 地图和 MIDI 旧出口退役

2026-11-21 用户批准退役 `loadAllProjectMaps` 和 `MidiPreviewSequencerAdapter.duration`，并迁移有效测试。以 `3666efdf8` 和已同步主线 `10378100a` 为基点，Codex 持有该切片写入权。核 22 份源码和专测调用、两个历史执行入口及真实地图审计/编辑器试听。活跃 E2E 的改动与本片零重叠。

地图合入候选 `bdda3eb1a` 删除包级批读和实现，保留保存审计的正式 `loadProjectMapById` 正文。Editor 的十八处装配器以测试夹具逐个索引 ID 读图，两处序列化专测只读受验地图。项目会话专测改走实际 `openLocalProject`，沿用它获取磁盘基线。地图专测保留未登记零 IO 和合法索引验证，将原批量容器用例迁为独立读取的乱序身份、失败上下文与另一张图正常加载。只覆盖逐图入口仍有生产意义的合同。旧反控按 `79705185cff017c899ed1e246d4ec333ca3298bb` 的冻结源码和两份旧专测恢复，历史浏览器宿主沿用原归档身份。

音频候选 `2a95573da` 移除浏览器适配器的无读者时长透传和专测替身字段。真实 MIDI 字节分析仍为试听时间轴提供时长，现有从半秒曲切至四分之一秒曲、读取失败后清空快照和重试的用例均保留。MIDI 和 BGM 文件的 SpessaSynth 窗口监听留项仍在 review。

沿用原八维读域，按差异补核接口消费者、单图独立 IO、失败传播、可读命名、测试归属和夹具复用。新增夹具只按索引组装编辑态所需的数据，单图读取和校验交给生产入口。完成原 `project-loader.ts` 的关闭，新增夹具独立登记。其余支持文件仅按此次接口迁移的范围复验。

Reforge 14 个文件、74 项及 Editor 22 个文件、203 项通过，stderr 均为空。两包 typecheck、变更静态与测试文档检查零诊断。首跑单图失败例误判 IO 错误不包装，修正断言后保留路径与原因。错读地图和吞掉读取错误两个反控各触发其指定断言，未改工作树中的单图实现。[原执行归档](../evidence/QUALITY-POST-GAME-ACCEPTANCE-AUDIT-1.tar.gz) 新增 `exports-retired/` 的原件及契约映射。全仓与覆盖率随稳定窗校验，此次更名的地图测试身份在该次实测时刷新。

### SpessaSynth 配套升级与真实退出

2026-11-21 用户批准先验兼容、再升级 4.4.0。以 `c7deefe56` 和主线 `10378100a` 为基点，Codex 持有音频依赖、供应 Worklet、两端请求地址及定向专测的写入权。活跃 E2E 仍是剧情测试与作者内容五个独立路径。隔离预检先通过候选类型和 Game、Reforge、Editor 的原生播放与退出，之后才更新依赖和配套产物。现行部署的 Worklet 缓存为 30 天，请求用实际库版本定位。

`spessasynth_lib` 与 Core 固定为 4.4.0，解码器固定为 0.0.6，匹配发布 Worklet 的 226 份 Core 源和两项内嵌依赖。Game 与 Reforge 发布同一处理器字节，并各自供应 Apache 与 MIT 许可证。Reforge 直接导入的曲谱解析器与播放库所依赖的 Core 相同。86 首 PAL 曲目的时长和音符事件逐曲与旧 Core 一致。

Chromium 使用实际 MIDI、音色库和 Web Audio，三条线路均观察到非零 PCM。预存旧版 HTTP 缓存后，实际入口均请求并加载带版本的新版处理器。

| 真实线路 | 退出后旧版 / 4.4.0 的 `beforeunload` 残留 | 释放观测 |
|---|---:|---|
| Game 切换 MIDI 到 RIX，再销毁音源 | 1 / 0 | MIDI 在切换时关闭，RIX 发声后也释放并关闭 |
| Reforge 试打中停止 | 1 / 0 | BGM 先销毁 Worklet，再关闭上下文，试打音效上下文一并关闭 |
| Editor 同页两次打开并关闭 MIDI 试听 | 2 / 0 | 两次独立发声，每次退出先销毁 Worklet 再关闭上下文 |

补核两份生产文件的八维并接受 `bgm.ts`、`midi-preview.ts`。Reforge 应用和试听保留各自序列状态及已有在途释放路径，共用加载和取消。移除缓存版本的两个定向反控均只红指定 URL 断言。Game 45 项、Reforge 74 项、Editor 20 项、供应字节与许可证 2 项、E2E 音频 URL 分类 1 项通过。三包 typecheck、生产构建及实际 Vite preview 资源请求通过。Reforge 并行首跑三例 5 秒超时，单独复跑同一选择和超时阈值通过。最终定向测试 stderr 为空。Chromium 的可选存档标记 404 单列，音频及脚本异常为零。重新解析 lock 时有 Core 的维护者版本弃用提示和一条既有传递依赖提示，冻结安装回执无提示。

逐文件结论、对照会话、失败与恢复、授权路径及复验命令见[原执行归档](../evidence/QUALITY-POST-GAME-ACCEPTANCE-AUDIT-1.tar.gz) `spessasynth-4.4.0/`。原生验证使用 Chromium 的真实 PCM 与上下文状态。适用范围为本地发布构建、测试服务及这三条播放路径。文件收口与集中交付分开，全仓检查、官方覆盖率和 protected fast 在下一稳定窗口执行。

### PR 集中收尾

同步 #75 的固定主线 `0443a023ce59e8c18910244c54ed34e5d392870d`。四份作者输入、原 E2E 执行结论和归档保持主线版本；对跨任务合并的来源校验用固定 #75 正文和治理侧当前来源元数据。两份迁移语料专测 5 项及报告校验 37 项通过。把只被两份音频专测使用的 MIDI 夹具迁入专测目录。试听序列器构造失败时，正式入口回归核实旧 Worklet 释放、同一曲目重试和退出；18 份相邻音频专测 106 项通过。

`pnpm check` 首轮因 Pal-extract 超时退出。保留首轮和后续失败日志，分别用原期限的完整文件复跑及 Migrate 语料断言更新与商店用例重组，完成 1,662 个产品专测文件、20,784 项，含各包 typecheck。全仓 lint 各级诊断为 0。官方 coverage ratchet 对同一主线完成 20,430 项。对照 #75 CI 确认 Editor 逐文件覆盖计数唯一回退来自退役旧地图测试装配，按授权精确重计一个分支覆盖命中。测量输入未变，复放原 ratchet 判定与基线写入后，本地保护基准复核通过。GitHub 门按 PR 运行记录验收。

[唯一执行归档](../evidence/QUALITY-POST-GAME-ACCEPTANCE-AUDIT-1.tar.gz) 的 `pr-closeout/` 保留首轮失败、完整复跑、覆盖率、账本和诊断计数。文件账本保持 1,363 closed、0 review、2,489 pending。候选进入 PR，任务卡保留 review 至合并。

原归档 401 件逐字节保全，本轮并入 144 件必要原件，净增 1,832,306 字节。运行缓存与重复采集副本依照本回执保全后清理。
