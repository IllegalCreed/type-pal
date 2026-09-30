# ARCH-PAL-SUPPLY-1 — 作者发布与PAL导入职责拆分、脚本转换退役

Status: build
Phase: phase2
Capability: A7（现有内容供应链治理，不新增能力格）
Coding Owner: pal_resource_supply（r5第二批隔离实现；Codex独立验收）
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: Codex（r4.1最小入口冷启动；首批CLI N/A）
Visual Verification Timing: build期最小功能验证；剧情E2E不在范围
Contributor: pal_supply_audit（r1只读准备）、pal_author_check（r2首批实现）、pal_supply_boundary（r5独立前提审查）、pal_resource_supply（r5实现）
Branch: codex/pal-resource-supply-r1（基点d3df4bbb；首批已入main，母卡未done）

## 用户裁决与目标（2026-09-30）

用户同意“原版脚本转换退出日常开发；保住并拆出资源重建、通用校验和安全发布，再归档或删除
无调用方转换代码”的方向。不是直接删除整个migrate包，不新增parallel/join，不改现有剧情。
用户随后要求“推进吧”。r1已完成依赖、维护入口和验证设计；r2首批具体准入见下文。
后续作者脚本合理化以canonical作者内容为真源，不维护一套从原版重新生成新编排的规则。

## 范围

- 范围内：盘点作者发布、PAL资源/地图导入、原版剧情/战斗脚本转换、专用审计的真实调用；
  设计各自独立入口、共享格式边界与确定性验收；依次拆分并退役无真实调用方的代码及专属测试。
- 首批实现白名单与单Owner见r2；本卡、看板、任务索引及操作文档由Codex维护。
- 范围外：content20/SAVE8版本切换、编辑器UI/运行时行为、剧情编排、角色数值/资源内容变化、
  第一阶段提取/解释器改造、GLM L/M/N补测、官方覆盖率基线与E2E检查点。
- 明确不做：大幅重迁作者脚本、手改baseline、为了退役降低闭包/路径/事务/零诊断门、
  保留无调用方旧版本转换器或以“以后可能用到”为理由保留备用发布路径。

## 前提真值门

### 一句话工程前提

作者内容不应依赖原版脚本转换才能校验和发布；仍被消费的资源/地图重建必须可重复且不损失
当前作者数据与写盘保护。拆分完成前，不把“退出日常流程”误写为“整个包已经无消费者”。

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 真实提取输入仍供应PAL资源、地图及原始表；旧脚本本身不是新作者编排的生成真源 | `packages/migrate/src/pal-migration-io.ts:14`、`packages/migrate/src/pal-assets.ts`；本卡不改变原版机制 |
| 第一阶段 | 独立消费extracted数据和原版事件指令；不需要第二阶段作者发布或migrate | `CLAUDE.md`的Asset pipeline/Event bytecode章节；第一阶段实现变化N/A |
| 当前二阶段 | publication保留作者baseline场景/共享正文并三方合并；原始源分区刷新仍调用完整buildPalMigration | `packages/migrate/src/pal-current-publication.ts:108/110/147/172`、`packages/migrate/scripts/migrate-content.mts:61/73` |
| 本任务目标 | 当前作者工程独立校验/发布，PAL导入仅更新明确原始源分区；转换代码只在真实调用消失后退役 | 用户本轮“可以”；范围与输出保真门见下文；资源静态映射与脚本推导混合依赖待逐项核清，不据此开放删除 |

### 反证与替代解释

- 最强替代解释：角色伤亡回调、精灵动作推导、物品提示等仍依赖真实原版脚本，不能把含脚本的
  所有模块统称“已完成导入”后删除。须识别静态分区与作者字段，不以文件名决定归属。
- 推翻观察：新独立重建缺少资源/动作/回调，生成分区hash变化，作者正文/稳定id/manifest遭覆盖，
  三方合并冲突或第二次发布非零差异，缺原始源时通用作者发布仍失败，均反证拆分边界不足。
- 本卡不是依据运行时失败或内容红项选择迁移修复层；无玩法/移动公式修正，runtime语义与原版
  行为争议N/A。提取/地图/数据解码保持输入与算法，测试模型以实际旧/新输出和调用阻断证据核定。
- 用户可见偏离：无剧情/UI目标变化。工程before→after为“作者发布与完整原版转换绑定→作者
  发布独立，资源导入按明确范围执行”。用户已批准该职责方向；新增产品取舍另行交裁决。

## 上下文锚点

- [READ-FIRST](../../phase2/READ-FIRST.md)铁律4/6/10/11：架构优先、合理脚本、真实生成缺陷修源、当前单版本。
- [发布维护入口](../../../packages/migrate/README.md)、[发布指南](../../phase2/guides/content-publication.md)、
  [作者脚本合同](../../phase2/specs/script-system.md)。
- `packages/migrate/src/pal-migration.ts:390/405`：migrateAll、mapScenesStatic、原始脚本图/overlay/
  动作物化/闭包审计仍在完整生成核内；不得只删入口而留下另一条同等转换路径。
- `packages/migrate/scripts/migrate-content.mts:54/73/115`：恢复事务、三方合并、TOCTOU检查、
  资源物化、manifest/baseline事务、重放零差异均须保留。
- `packages/migrate/src/pal-item-scheme-labels.ts:69`：PAL专用手写命令遍历不是通用作者校验的理想维护点。
- `packages/editor/src/core/project-io.ts:163`：作者保存已有当前工程加载/序列化与资源预检，不依赖migrate。
- 一阶段知识按[harvest](../../phase2/reference/phase1-knowledge-harvest.md)资源/地图相关条目核资产约定；
  本卡不重新实现解码、调色板、瓦片转换或绘制，不把旧审计快照当当前缺陷。
- 当前基点`784fb098`；主树E2E合理化文档改动保留，GLM L/M/N各自隔离任务不重叠。

## 分批设计与验收

1. 准备：形成真实依赖图和每个发布分区的字段维护边界；列保留、拆分、退役清单及消费者证据。
2. 首批实现：切断日常作者校验/发布与原版脚本转换依赖；具体入口、文件白名单和模块归属需
   从第1步证据收敛，不新增旧版本兼容、不重复实现已有通用校验器。
3. 资源重建：从完整转换核中分离仍有真实用途的PAL资源/地图与静态表推导；对每一消费分区
   做旧/新内存输出保真，作者场景/共享/物品/自定义角色/精灵等不得被重建覆盖。
4. 退役：只有生产命令、审计、测试支持调用都已替代/取消且原始输入重建仍成立，才删除对应
   转换入口/实现/专属测试。历史由Git保存，不保留无消费的“备用模式”。

门禁：通用作者校验可不读取extracted；坏嵌套引用/资源仍fail-loud；PAL导入对保留分区确定性
重建；作者改动保留；三方合并/冲突检测/路径安全/中断恢复/manifest最后提交不退化；在隔离临时
工程验证发布重放零差异。不得运行主项目--write，不动用户编辑器、存档或真实检查点。
单测/集成与反控须证独立边界，不只比较“两个实现同时漏掉某字段”的摘要。lint/格式/typecheck
全零诊断及全仓check单独记录；不将作者自验当Codex独立验收，不宣称本卡带来覆盖率增长。
首批CLI视觉N/A：不改显示或剧情；r4.1追加质量包仅核三个功能入口冷启动，不进入剧情。
001/002流程仍由E2E母卡负责，本卡不冒充剧情验收。

## r1只读准备与独立复核（2026-09-30）

Codex独立读取publication、完整生成核、源读取器、伤亡解析、物品消息同步、alias校验和现行
作者保存链；只读贡献者`pal_supply_audit`另外逐项核生产/审计/测试消费者。以下是双方源码
复核收敛，不是实现自验或build准入。没有新产品取舍：首批保持当前字段归属。

| 分区/职责 | 实际边界与保留条件 | 一手锚点 |
|---|---|---|
| catalog、地图/索引、瓦片集、商店 | 可独立从资源/地图/stores源重建，不应调用世界剧情转换 | `packages/migrate/src/pal-assets.ts:1034/1090`、`packages/migrate/src/pal-migration.ts:393/616/627/628/636` |
| 六角色 | 基础表与4个真实伤亡回调混合；不能用只有数值的mapActor代替当前完整输出 | `packages/migrate/src/migrate-content.ts:276`、`packages/migrate/src/pal-casualty-scripts.ts:149` |
| 物品 | 作者正文保留，只同步item268炼蛊/item270资源池失败提示；应抽窄producer，不再为两个消息调用migrateAll | `packages/migrate/src/pal-authored-overlays.ts:324/367`、`packages/migrate/src/migrate-content.ts:962/1058` |
| sprites与场景别名 | 保留current定义，只退休严格等价重复定义并改显式清单内引用；不是全量generated sprites覆盖 | `packages/migrate/src/pal-world-sprite-semantic-alias.ts:80/206`、`packages/migrate/src/pal-current-publication.ts:162/190` |
| 环境动作重新推导 | 真实依赖全脚本及外部写入排除，但其新场景正文/完整精灵列表不用于日常current发布；独立审计入口需显式取消或替代后才删 | `packages/migrate/src/pal-migration.ts:529/542`、`packages/migrate/src/pal-sprite-action-census.ts:1043`、`packages/migrate/scripts/audit-pal-sprite-actions.mts:9` |
| 作者维护 | 现有current loader与作者保存已不依赖PAL原始输入；优先复用，不能为拆分重复造一套校验器 | `packages/reforge/src/project-loader.ts:324`、`packages/editor/src/core/project-io.ts:163` |

关键counter已收窄：反对的是“一次删除全部原始脚本解析”，不是职责拆分方向。把六角色伤亡/
两类物品提示也改为纯作者所有，或要求继续从原版重推所有环境动作，均属于新的范围/维护权
取舍，首批不自行决定。原始数据窄解码器有真实输入与用途，不等于保留旧开发工程兼容层。

完整转换核的实际入口仍有current publication、原版动作审计及相应测试/fixtures。未发布的技能、
敌AI、共享库、场景正文、locale等生成工作不应继续作为作者发布前提；删除专属测试须跟随
能力退役，不能为了维护测试让旧转换常驻。类型和静态helper也需从大转换模块分离，否则
“只调静态函数”仍可能在模块加载时带入完整translator。

通用作者门不得复制PAL专用约束：原始地图数量、原始SceneId完整保留、固定商店调用census、
49个物品剧情方案/4内部状态机/11物品root等留在PAL导入审计侧；当前schema、引用、资源闭包
及写盘安全才是作者发布的通用合同。原有source侧约束不因拆分直接降低或取消。

安全纠正：`packages/migrate/scripts/migrate-content.mts:53`在`:103`判断dry-run退出前先调用
recoverMigrationTransaction；有待恢复journal时可能写盘。本轮没调用该CLI（含不带--write的
形式），只读准备与未来验证均用纯内存或独立临时工程，不把“dry-run”当绝对无写承诺。

验证（当前树、未改实现）：current loader两文件19项、迁移计划/合并/事务/写盘计划四文件57项，
合计76项通过。它们是准备基线，不证明新拆分已完成。文档检查零问题、文档工具37项测试、
任务索引与diff检查通过；
未跑全仓check/覆盖率，未启动浏览器，未更动projects/pal/baseline/存档/资源或删除任何文件。

## 当前模式推进记录

### r1 draft核定（历史）

- Codex：r1依赖清单已核；现有作者维护可复用，资源/静态表与窄源脚本用途不得混删。
  首批从独立作者校验/发布边界开始；具体实现入口与独占白名单在选定Coding Owner时核定。
- Coding Owner/隔离工作树/实现白名单：未分配；只读贡献者可调查，不得修改产品代码。
- build准入：未开放；取消固定三签不取消事实/单Owner/独立验收门。
- done准入：未开放；不得把方向获批或开卡称为退役完成。

### r2首批准入与r3 Node边界修订（2026-09-30）

Codex：premise verified / design agree / **build allowed，仅下述首批**。直接读取
`project-io.ts:163/358/651`、`project-diagnostics.ts:823`、`project-save-state.ts:76`和
`seed.ts:76`：已有作者保存门独立于PAL输入，空白工程合成资产不需原版。新增只读入口复用该门，
不复制schema/引用扫描规则；PAL特定数量与原版推导留在重导侧。

首批before→after：日常CLI校验需要完整PAL源转换 → 作者工程可直接只读全量检查；现有编辑器
作者保存已独立，继续用原事务，不新建另一套作者写盘或发布事务。尚未切断PAL重导命令对完整
转换核的依赖，不冒称整个迁移器已退休。

- 单Owner：`pal_author_check`；隔离目录`/Users/zhangxu/.codex/worktrees/pal-author-check/type-pal`，
  分支`codex/pal-author-check-r1`。Codex不与Owner同时修改同一实现文件，交回后独立复核。
- 独占实现白名单：根`package.json`；`packages/editor/package.json`；
  `packages/editor/src/core/project-io.ts`；新`packages/editor/src/core/author-project-check.test.ts`；
  新`packages/editor/scripts/check-project.mts`、`author-project-source.ts`、
  `author-project-source.test.ts`、`tsconfig.author-check.json`。
- 入口：根`check:content`与editor的`check:project`，接收工程目录（默认仓库PAL目录），仅只读。
  Node文件源限制在指定工程闭包，拒绝不规范相对路径/逃逸symlink，只有真实ENOENT可映射缺文件；
  权限、JSON和其他IO错误传播。不接受写盘模式、不调用恢复事务或PAL迁移/源读取器。
- 校验：同一个既有作者保存校验核覆盖所有SceneIndex场景、共享/物品/敌人正文、稳定引用、
  变量/实体地址、资源闭包与catalog字节/hash/RLE；额外复用当前ProjectMap解析器逐张核所有
  MapIndex地图及瓦片集引用，不把地图copy-through视为已校验。整个读取以现有save-state门
  包住，pending保存或读取中换代拒绝，不授予恢复/写权限；无OS级快照或CAS承诺。
- 静态门：新增Node脚本也进入专用tsconfig并由editor typecheck运行；不调整公共lint规则、
  根tsconfig、依赖/lock、现有测试配置、官方覆盖率清单/基线或版本。新增生产代码可能改变自动
  统计分母，留给正常覆盖流程测量，不承诺分母不变或本卡带来覆盖率增长。
- 验收反控：零原版字节合成工程通过；非入口场景/嵌套共享引用、地图/瓦片引用、缺资源、
  等长错hash、坏RLE、pending/变代save-state、路径逃逸失败；内存目录无create/close/remove，
  CLI实际子进程成功/失败退出码与前后文件hash一致；不访问extracted且不触发PAL转换。
- Owner自测交回候选提交及日志；Codex独立复核原/候选保存路径、实跑CLI与核心回归，再执行
  全仓check与零诊断门。主工程只读，写盘测试限临时合成目录。不启动剧情/改UI，视觉N/A。
- 首批accept与母卡最终done分开记录：资源供应拆分和转换核退役尚未完成，不将首批通过标母卡done。

#### r3 counter闭合与追加白名单

Root在真实Node中加载`project-io.ts`，直接失败于`engine-chrome/registry.ts:52`的
`import.meta.glob`。独立只读审查追到`reforge/package.json:9`→`index.ts:224` eager bootGame
导入→`main.ts:74`→registry；PAL独立并不等于Node可加载。r2“直接使用现有宽barrel”设计
在此反证后停止，不以Vitest/Vite变换通过代替实际Node。r2校验合同及无写盘产品边界不变。

Codex与独立审查已读纯叶`assets.ts`、`project-loader.ts`、`project-save-state.ts`、
`fsa-source.ts`、`battle-trial-config.ts`、`runtime-project-view.ts`及可达编辑器导入；
Owner提议合法headless子路径，Codex核定 **r3 build allowed**：

- 追加独占白名单：`packages/reforge/package.json`、新`packages/reforge/src/author-io.ts`；
  `packages/editor/src/core/author-save-journal.ts`、`author-save-store.ts`、
  `author-disk-baseline.ts`、`battle-simulator-library.ts`、`script-editor-projection.ts`。
- 只新增`@type-pal/reforge/author-io`纯叶出口，保持已有函数/类型身份与行为；上述编辑器文件
  只切换运行时导入入口，不调整保存/恢复/投影/模拟器算法。原宽barrel保持现有消费者合同。
- 不加glob/browser polyfill、Node require hook、Vite专用CLI或复制validator；不改seed-assets、
  main/registry、L/M/N冻结源或已有公共签名。合成种子由Vitest构建后交真实Node子进程校验。
- 真实Node import及CLI子进程必须通过；浏览器editor build、现有author-save/preset/projection
  回归由Codex独立验证。此修订只是拆除浏览器宿主耦合，不改变源字段维护权或脚本模型。

Node静态所有权补充：新CLI专用tsconfig的`types:['node']`真实报TS2688，editor未直接声明
Node类型。Codex读取当前lock与game/migrate声明后批准唯一依赖例外：editor新增devDependency
`@types/node:^25.9.1`，复用已锁定25.9.1；追加`pnpm-lock.yaml`白名单仅对应editor importer。
用pnpm离线更新，不升级其它包或锁定版本；不借其它包node_modules、pnpm内部typeRoots、
全局声明或跳过CLI typecheck。原“不改依赖/lock”限制除本项外继续有效。

### r4独立复核与中央质量清理（2026-09-30，过程记录）

Owner交回候选`705d07ec`，16文件669增/7删；隔离树干净。Codex独立逐文件核保存校验核的
原/新路径、五处纯导入变更、Node路径/错误边界和反控，真实Node import通过；独立定向回归
7文件157项通过，真实PAL只读CLI通过294场景/223地图/1934资源。本地合并`e24da370`后，
根入口相对路径`pnpm check:content projects/pal`再次通过；没有调用PAL重导或写盘CLI。
作者自验8文件179项与上述独立结果分别记录，不混写为同一验收计数。

首轮全仓check：其它六包全部通过；editor为3687通过/1失败，设计系统子进程审计超过既有
15秒测试限额（约15.99秒），未发现审计内容红项。单独执行同一`audit-legacy-controls --gate`
通过。根lint另跑2768文件、0 error/warning/info。保留失败事实；不得由局部通过宣布全仓门通过。
包串行调度重跑仍有一个editor失败，完整原因待核；测试超时与断言不放宽，暂不假定已闭合。

editor build退出0但有默认500kB超限warning（main 1441.35kB、共享块748.37kB），不能作
零诊断收口。Codex按AGENTS中央质量责任接手；**r4 build allowed，仅以下最小质量白名单**：

- `packages/editor/vite.config.ts`：保留三个HTML input和所有中间件；使用Vite8正式
  `rolldownOptions.output.codeSplitting.groups`，单组`modules / entriesAware:true / maxSize:500000`。
  保留递归依赖true、跨入口合并阈值0和执行顺序选项的官方默认，不改warning阈值或隐藏日志。
- `packages/editor/package.json`的test调度：只有相同全量测试在单worker实测通过并核定资源
  竞争前提后，才可从2改1；不减少测试、改timeout或放宽硬门。本项尚未实施。
- 本卡与看板质量/验收记录由Codex维护；不改UI源码、依赖/lock、规则、覆盖率或用户工程。

独立只读审查`pal_supply_audit`读取安装Vite8.0.14/Rolldown1.0.2类型、三个源入口及原产物
传递静态闭包：同意最小分包可试行，指出maxSize是模块字节近似目标，不能代替最终压缩输出
和副作用顺序验证。证据为Rolldown的CodeSplittingGroup entriesAware/mergeThreshold/
recursive条目，及`reforge/src/audio/spessa-browser-runtime.ts:23`、`midi-preview.ts:96/126`、
`bgm.ts:85`、`index.ts:343`的真实动态边。正式验收还须：实际零warning、最大JS字节、
入口静态闭包/模块归属/新增环、三个生产入口冷启动；不把分包称为减少首页总下载或懒加载优化。
临时构建诊断最大压缩JS 241.26kB，不算正式配置或全仓验收；不进入剧情、不写存档或工程。

首批源码复核可接收，但统一质量与集成收口仍pending；母卡资源供应拆分/转换核退役仍未完成。

#### r4.1质量反证与最小修订准入

包串行、editor双worker的第二次全仓check仍在同一15秒gate超时（3687通过/1失败）。同样483
文件/3688项测试、原断言/timeout不变，editor单worker完整运行425.74秒通过。独立审查核
Vitest同步函数返回后的elapsed检查、审计父worker有界AST缓存与另起Node的冷加载；只能证明
低并发满足预算，不宣称消除了审计计算成本或已证明内存泄漏。Codex核定执行r4的editor test
从2改1；追加根`package.json`白名单，仅check/test/check:fast中递归check/test调度显式
`--workspace-concurrency=1`，避免包级重型PAL/设计审计竞争。测试集合、规则与超时不改。

首个分包候选正式产物虽零warning，但拒收：新增静态回边归并4个SCC；更强反证为index.html
与两个chunk引用`main-CNcHZOo3.js`，产物中该文件不存在。独立审查用TS AST和目录实证，
Codex真实Chrome冷启动确认404与空body，不能把“小块/成功退出”视为安全。没有推广或推送该配置。

**r4.1 build allowed，仍仅同一vite配置白名单**：group只匹配JS/TS源扩展
`/\.[cm]?[jt]sx?(?:\?|$)/`，排除HTML facade；保持entriesAware/递归/merge默认边界。
已出现跨chunk循环后，启用官方`strictExecutionOrder:true`的内部ESM初始化器，保留源模块
执行顺序，不靠反控豁免掩盖顺序风险。安装Rolldown类型明确此选项注入runtime helper；内存
构建反控34块/max244569字节，所有静态/动态及3个HTML脚本目标存在。此结果仍不能代替正式
构建、真实初始化器/闭包证据与三页启动。静态SCC可存在，但须证明是初始化器保护的边，而不是
以“浏览器偶然没报错”证明所有初始化安全；若入口缺失/提前加载/启动失败继续拒收。

#### r4.1正式产物与最小启动证据（过程记录）

正式`pnpm --filter @type-pal/editor build`退出0、0 warning；最大压缩JS 244569字节。
Codex以同一配置的Vite output metadata独立核所有HTML/静态/dynamic目标存在，实际模块归属
证明Design Lab初始闭包没有reforge/editor-core，main/play初始闭包没有Spessa两库或独立
试打host。初始JS为main2535100字节/26块、play768019/10块、Design Lab331760/10块；
较原产物总字节与请求数略增，不把消除单块超限包装成首页下载/性能优化。

原生Chrome全新隔离context（Playwright默认browser二进制缺失，改用已安装Chrome，不安装
依赖或碰用户profile）：index?picker、Design Lab及play独立试打握手等待均真实渲染，
0 pageerror / console error / HTTP失败。截图位于临时证据目录
`/tmp/type-pal-author-build-CeNbp6/{editor-cold,design-lab-cold,play-cold}.png`，Codex逐张查看。
不选择本地文件夹、不发试打配置、不进入剧情；无用户工程/游戏存档写入，测试context已关闭。
新增结构SCC的初始化器证明由独立只读审查补核；全仓check最终结果仍待返回。

### 首批独立验收结论（2026-09-30）

Codex：**accept，仅首批只读作者检查及r4.1中央质量小包；母卡继续build**。已核候选
`705d07ec`与本地集成`e24da370`，不由作者自验替代独立复核；两次全仓超时与首个分包
缺失入口反证保留为历史，未降低规则、提高timeout、删测试或抬高chunk warning阈值。

最终普通入口`pnpm check`退出0：7包1304测试文件/11175项全部通过，工具测试125项通过，
合计11300项；全部包typecheck（含Node CLI专用程序）零诊断。完整lint报告2768文件、
0 error / 0 warning / 0 info。editor全量483文件/3688项在最终根流程通过，原15秒审计
限制不变；迁移包132文件/1008项通过。正式editor build零warning；diff检查与本批格式检查通过。
最终根相对路径CLI再次只读通过294场景/223地图/1934资源；主PAL与官方覆盖率基线无diff。

独立只读审查最终用TS AST核正式产物4个SCC（2/4/2/6块）：直接顶层跨块eager binding读取
和NewExpression均0，顶层调用仅创建runtime initializer；React两块是CJS closure，其余
12块是ESM once closure。三个保留HTML facade先init依赖再init页面，页面createRoot/
play DOM与boot均在初始化函数体内，源执行顺序由官方strictExecutionOrder机制保持。
全部HTML/静态/字面量dynamic目标存在，懒边界与最大字节独立核同。局部counter闭合，
不声称已验证所有深层交互；Codex三页真实冷启动与截图补齐最小功能门。

本批复用已有作者保存校验核与事务门，未引入另一套validator或作者写盘协议；pnpm/Vitest
调度仅收敛并发，Vite8真实分包保留入口与源初始化顺序。剧情/NPC移动/parallel、当前schema/
save版本、PAL资源/作者正文、官方覆盖率和GLM候选包均未改。未运行剧情E2E或主工程重导/写盘。

后续仍须核定独占文件白名单，再分离资源/地图/静态表与真实窄脚本producer，做旧/新内存
输出保真及作者数据保留。完整转换核仍有PAL重导/专用审计消费者，未删除；不得将首批accept
写作整个migrate包退休或母卡done。临时贡献者worktree/分支按接收后流程清理，代码由Git保留。

## r5资源供应准入（2026-09-30）

用户再次批准继续第二批。Codex独立读`pal-current-publication.ts:110/147/172`、
`pal-migration.ts:390-668`、`migrate-content.ts:276-383/962-1087/2232-2420`、
`pal-sprite-action-materialize.ts:175-229`、`pal-migration-io.ts:14-115`及实际消费者：
current只消费资源/地图/商店、六角色（含伤亡）、两类物品提示及精灵别名静态证据。
实体sprite引用由源场景布局预注册决定，动作物化不改该引用。不是根据文件名猜职责。

独立审查者`pal_supply_boundary`另做真实Node纯内存生成：六语义SpriteDef与mapSprites逐对象
相等且无poses，六旧base定义均absent，角色域没有accepted物化site；五配置角色的源引用
7/6/18/11/9，共51处。巫后spriteNum=525、walkFrames=0且没有场景声明，旧base absent。
窄mapActor+casualty与完整六角色相等，268/270窄effect与完整输出相等。未执行重导CLI。
反例仍为未知动作/布局、别名新增或漂移、角色回调缺失、提示/配方不匹配、作者数据被替换。
这里的role无poses是当前输入实证，不是对任意未来原始脚本的证明：current不再运行环境
动作census，只维护静态别名证据；该原始脚本漂移审计继续由专用入口承担。重新提取若出现
角色动作或全角色重复域改变，须先复核本边界，不得把静态定义当成全部脚本推导的替代真源。
注册表证据仍按源实体实际使用懒取，不能把未使用的所有注册项伪装成旧generated定义。

四向前提沿用母卡：primary输入仍为提取的资源/地图/静态表与真实四伤亡/两提示；第一阶段
不改；当前二阶段为上述完整转换耦合；目标只切断current对世界/技能/敌AI转换的依赖，
不改变当前字段维护权。before→after为“PAL重导需完整剧情翻译→只运行明确源分区供应”。
已获用户批准；原版环境动作审计另保留真实消费者，本批不删除它或宣称整核退休。

Codex：**premise verified / design agree / build allowed，仅下列第二批**。

- 单Owner：`pal_resource_supply`；隔离工作树
  `/Users/zhangxu/.codex/worktrees/pal-resource-supply/type-pal`，分支`codex/pal-resource-supply-r1`。
  Codex只写主树任务卡/看板与验收材料，不与Owner重叠写实现。
- 现有实现白名单：`packages/migrate/src/migrate-content.ts`、`pal-migration.ts`、
  `pal-migration-io.ts`、`pal-current-publication.ts`、`pal-world-sprite-semantic-alias.ts`、
  `pal-casualty-scripts.ts`、`packages/migrate/scripts/migrate-content.mts`。
- 新文件白名单（均在`packages/migrate/src/`）：`pal-content-supply.ts`、
  `pal-content-supply-io.ts`、`pal-role-mapping.ts`、`pal-item-message-source.ts`、
  `pal-world-sprite-registry.ts`、`pal-source-io.ts`、`pal-sound-assets.ts`及这些模块同名
  `.test.ts`/`.pal.test.ts`测试；可修改现有`pal-current-publication.pal.test.ts`补保留反控。
  非必要模块不新建；必要越界先报告Codex追加准入。
- 静态helper和布局预注册从现有核提成单一纯leaf，旧转换核复用/重导出，不复制算法。
  新supply只生产实际消费分区与角色别名证据；不生产作者场景正文、共享库、技能或敌AI。
  新source loader不读scene事件文件/技能/敌AI表；all.json仅供四伤亡/两提示窄消费者。
  catalog字节/RLE与地图审计仍复用原算法，角色音效仍按catalog过滤，SceneIndex原始id
  保护与全角色严格重复定义闭包保留；不得用配置清单伪造实际引用集。
- current组装改调用新supply，重导CLI改用新loader，其规划/三方合并/事务/恢复/TOCTOU/
  资源物化/manifest-last代码不改。source loader仍隔离PAL输入，不成为通用作者校验前提。
- 验收：真实新/旧分区逐对象相等（全部223地图、catalog、shops、六角色、两effect、
  SceneIndex id域、角色定义/legacy状态/51引用与maps报告）；抛错模块mock与运行时导入图
  同证无完整converter加载/调用；loader实际缺技能/敌AI/scene事件仍成功，必需输入缺失失败。
  别名清单外引用/错布局、回调/消息形状漂移、Store0错误与map错误仍fail-loud。
  作者场景自定义路径/正文、共享脚本、物品价格/说明、自定义角色/sprites保持，三方冲突
  不覆盖且临时工程事务重放零差异；源与baseline入参不可被修改。
- Owner自验与Codex独立复核分别记录；静态零诊断、全仓check均须通过。只读真实工程，
  发布写测试限临时目录，不跑主项目重导CLI（含dry-run）。不改配置/依赖/lock/官方覆盖率/
  projects/pal/baseline/存档/第一阶段/GLM L/M/N源；无UI或剧情变化，视觉N/A。

### r5冻结候选与独立输出复核

Owner交回`63aafb81`：18文件1384增/622删；包级自验136文件1031项通过，typecheck与
18文件Biome零诊断，diff-check为空。初轮新增测试20通过/2失败均为fixture（缺真实soundfont、
误把walkFrames0当零帧），首次22条格式诊断、一次共享脚本fixture的TS2353均原样保留过程，
修复后重跑通过；不降低规则/断言/timeout。本卡不把作者自验当独立验收。

Codex逐文件核静态提取、窄loader/supply、current调用以及CLI仅两处import/call切换；
冻结候选在真实Node内禁载完整转换模块，独立与实现前`d3df4bbb`冻结oracle逐对象比较全部
537发布文件、223地图/报告、294场景引用、1934资产、六角色与两effect：全部相等。
另一份包含自定义场景路径/正文、共享脚本、角色/sprite及物品价格/描述的537文件作者fixture
也全相等；源JSON/binary hash与baseline不变。另8个坏回调、用途、地图和alias反控全部失败。
独立脚本在`/tmp/type-pal-supply-proof-nLdnEI`，只生成临时证据，不跑主工程重导CLI。
复跑启动曾漏传候选路径、误用strip-types而未启用tsx解析，均在产品加载前失败；改正启动参数
后完整复核通过，无产品修订。全仓统一质量门留到r6最终候选，r5技术拆分可接收但母卡未done。
冻结oracle文件SHA256为`41561cc871fe127798bb0ade82adb101949a5bfc778dfc7e6a8eb9c6d2aa0e7f`，
规范化publication摘要为`07cf552e3ddb2e0a5a5cb7606bf8441fa6a8f143ea703384d8c2b01545eee6e6`。

## r6用户裁决与退役准入（2026-09-30）

Codex向用户明确区分“原版环境动作自动转换审计”与“canonical作者内容/E2E脚本合理化”。
用户直接选择**退役原版动作审计，继续删除完整脚本转换核**。本裁决替代r5“本批保留”的
后续维护要求，不重写C2-ACT等已完成任务的历史签字、数据和差分证据。

- before→after：保留可执行原版自动转换/census → 历史证明由Git/归档保存，日常仅运行
  窄资源供应、当前作者检查与作者内容E2E；不再以重新生成的原版脚本评判新编排。
- 最后实际命令消费者`audit-pal-sprite-actions.mts:3-9`被用户批准取消；此前完整核只剩此
  原始参考审计和专属测试。删除前仍要核bake/audit:maps/root工具的传递闭包与barrel导出。
- r5 Owner先冻结候选、交回包级自验；Codex独立原/新完整publication与作者保留对照已通过，
  native Node禁止完整核已通过，8独立失败反控通过；WIP不代替冻结验收，统一质量门pending。
- r6须迁出仍用的JSON/file-set类型与PAL外部源形状、战斗sprite id小函数，再按精确消费者
  清单退役实现/命令/专属测试。只引用静态leaf的测试应改引用或迁移，不为删旧核丢掉现行
  资源/角色/物品/别名/地图/事务反控。真实四伤亡/两提示是窄输入消费者，仍保留。
- Codex已核下述准入；静态零诊断、全仓门与最终独立验收仍pending。不得自行删除所有migrate
  文件、改变当前schema/save或放宽覆盖率门/基线。本轮不改NPC或parallel/join。

### r6前提与独立反证

一句话前提：用户取消完整原版转换的最后动作审计命令后，其核仅有退休能力的测试消费者；
当前资源供应/地图审计/bake/事务与作者检查仍有用途，不能被名字或旧测试关系一并删掉。

| 维度 | 已核真值 | 一手证据（冻结r5 `63aafb81`） |
|---|---|---|
| 原版/primary | 原始源仍供应静态资源及四伤亡/两提示；不再重新翻译环境或战斗脚本 | `pal-source-io.ts:13`、`pal-casualty-scripts.ts:149`、`pal-item-message-source.ts:41`；原始事件/提取器本身不删除 |
| 第一阶段 | game/pal-extract消费原始数据，不导入migrate全核；原版解释器和机制真值不变 | `CLAUDE.md` Asset pipeline/Event bytecode；跨packages消费者检索未发现第一阶段调用，机制变更N/A |
| 当前二阶段 | migrate:content已只调窄loader/current；唯一全核命令为用户批准取消的audit:sprite-actions | `scripts/migrate-content.mts:26/61`、`scripts/audit-pal-sprite-actions.mts:3-9`、`src/index.ts:13-14` |
| 目标 | 撤掉原版转换/审计入口、全核和专属测试，迁出实际静态类型/helper；不重生成作者数据 | 用户本轮直接裁决；`scripts/bake-assets.mts`与`scripts/audit-project-maps.mts`直接读资源/地图，无全核链 |

独立只读贡献者pal_supply_boundary逐项核命令传递闭包：动作命令取消后，下列24个src模块
无剩余生产runtime消费者；12条保留模块的type-only边须迁出。Codex另直接读取命令、barrel、
事务类型、源形状以及mixed tests，核同一结论。所有引用只读，不执行有恢复/写盘的CLI。
最强替代解释是静态角色/声音/布局或写盘测试仍借大核；所以不以“测试也引用旧核”直接删测。
推翻观察：剩余生产导入任何退役模块/旧profile、保留反控丢失、冻结537文件oracle漂移、作者
fixture或事务重放失败，均停止并返工；真实原版输入缺失与错误仍必须失败。

### r6单Owner和实现白名单

Codex：premise verified / design agree / **r6 build allowed**。同一Owner `pal_resource_supply`，
同一隔离worktree/分支，从冻结`63aafb81`续接。Root维护文档及覆盖工具死路径清理，不与Owner
重叠写实现；Owner不得合main、推官方覆盖率基线或标done。

- 新纯leaf：`packages/migrate/src/migration-files.ts`（JSON/两字段file-set合同）、
  `pal-source-types.ts`（仍消费的外部PAL role/item/scene形状）；可新增同名测试及
  `pal-role-mapping.test.ts`、`pal-role-mapping.pal.test.ts`、`pal-sound-assets.test.ts`、
  `script-conversion-retirement.test.ts`。类型迁移不复制全核report/profile，不保留旧compat。
- 保留实现改动白名单（均src）：`migration-baseline.ts`、`migration-merge.ts`、
  `migration-plan.ts`、`migration-project-io.ts`、`pal-current-publication.ts`、
  `pal-content-supply.ts`、`pal-role-mapping.ts`、`pal-item-message-source.ts`、
  `pal-casualty-scripts.ts`、`pal-source-io.ts`、`pal-world-sprite-registry.ts`、`source-facts.ts`、
  `pal-battle-sprites.ts`、`pal-authored-overlays.ts`、`pal-derived-content.ts`、`index.ts`；
  通用事务/三方合并仅迁type import/合同，不改算法。
- 只删除已核旧实现（均src）：`item-script-roots.ts`、`legacy-dialog.ts`、`migrate-content.ts`、
  `migrate-enemies.ts`、`music-reference-audit.ts`、`pal-boss-overlay.ts`、`pal-migration-io.ts`、
  `pal-migration.ts`、`pal-palette-sites.ts`、`pal-sprite-action-census.ts`、
  `pal-sprite-action-materialize.ts`、`scene-entry-normalize.ts`、`scene-entry.ts`、
  `scene-migration-source-plan.ts`、`script-control-flow-audit.ts`、`script-graph.ts`、
  `script-library-audit.ts`、`script-library-normalize.ts`、`script-overlays.ts`、
  `sound-reference-audit.ts`、`translate-enemy-hook-flow.ts`、`translate-enemy-scripts.ts`、
  `translate-event-motion.ts`、`translate-events.ts`。
- 删除`scripts/audit-pal-sprite-actions.mts`，修改`packages/migrate/package.json`只撤该audit命令；
  index撤两个动作星导出并纠正职责注释。不改其它入口、依赖/lock/tsconfig/Vitest或规则。
- 保留模块中的死路径收紧：registry撤数字脚本resolver/对外ensure接口，保留内部scene懒取/
  layout注册；source-facts撤translator-only facing/word/坐标/符号/旧实体地址helper；
  authored-overlays撤技能overlay/profile/纯full-use状态表，保留current item及两提示严格同步器；
  derived-content撤毒生成器但保留shops；battle-sprites撤enemy/summon/full builders，保留
  当前角色playerId和资产字节测试消费的两组framecounts；两组可原样迁入`pal-assets.test.ts`
  作为真实字节冻结expected，避免production只为测试导出，不为死builder迁SourceEnemy。

### r6测试与fixture白名单、保留合同

只在`packages/migrate/src`现有测试/fixture中，允许修改引用上述退休模块或其死API的文件，
以及r5新测试和已有`pal-current-publication.pal.test.ts`；范围以冻结r5的静态import/调用为准。
纯转换测试随能力退役删除；mixed必须拆出仍用case后再删，不以减测试计数宣称质量/覆盖提高。

- `migrate-records.pure.test.ts:51-159`四个actor/identity case；`migrate-content.test.ts:113-211`
  角色/装备槽种子、6sprites、role映射；`:436-618`七个craft/resource真链/严格尾/地址/环反控；
  `migrate-item-use.pure.test.ts:179-264`三个craft/resource case，迁到对应静态leaf测试。
  其desc/level-up/完整use/place/shared/技能/throw/场景翻译case才退休。
- `migrate-content.glm-next-wave.test.ts:133-145`中性sprite id case迁registry；
  `pal-migration.glm-next-wave.test.ts`声音resolver两项全保留改leaf；
  `pal-migration-io.glm-large-wave.test.ts`五个场景stub/数量/地图guard迁窄loader，fixture
  缩为真实窄输入，不能删source guard覆盖。
- `world-sprite-layout-registry.test.ts`改直接registry：保留资源/布局不等不alias、scene顺序、
  懒取、193 overlay真变体与scene多布局稳定id；只撤数字脚本/未知脚本目标case。
  r5 registry测试同期撤旧数字resolver断言，未注册scene fail-loud继续保留。
- 现行PAL地图名/商店/角色/别名/作者发布/事务相关测试改窄入口，保留所有仍有效反控；
  r5旧新比较测试改为当前合同/源事实断言，不留oldconverter以养oracle。
  Codex独立最终仍与实现前冻结旧oracle逐537文件对照，避免“两边一起改错”。
- 可删fixture：`__tests__/migration-assembly-fixtures.ts`、`scene-migration-fixtures.ts`、
  `translation-fixtures.ts`、`enemy-hook-fixtures.ts`、`glm-large-wave/sound-audit-fixture.ts`、
  `coverage-wave2/f-enemies-source.ts`、`coverage-wave2/f-script-library.ts`；
  `pure-migration-fixtures.ts`保留raw/unchanged/role和窄item需求，迁leaf types，撤magic/spell。
  通用guard/planned-changes、pal-asset与casualty fixtures保留。
- 添加文件/入口不存在＋源码import/export/profile负门，保证runtime及type无旧全核边；
  原生Node供给/作者保留/11缺源失败/事务重放继续跑。完整migrate check、静态零诊断须交回；
  Codex再独立核diff/反控/真实PAL/check:content/全仓check。视觉N/A，不改剧情/UI。
- Root仅清理`scripts/coverage/config.mjs`中已删除测试的旧exclude路径；不新增exclude、
  改include/门限/真实资源前提或重写`baseline.fast.json`。历史审计卡/签字/计数原样保留。
  `baselines/script-control-flow/pal-v1.json`是N3已完成审计的冻结数据证明，不是当前可执行门
  或兼容输入；保留其原始字节，删除审计代码不重写历史测量。
  Root另更新README/发布指南及READ-FIRST铁律10的字段归属说明：已有作者正文不再要求同步
  退役规则，明确源分区的已证上游缺陷仍必须修源。这是用户裁决的文档接线，不扩schema/UI。

## 交接记录

- 2026-09-30 Codex：用户批准职责方向；开draft卡，首批只读核资产/静态表与脚本推导依赖。
  不改产品、生成内容、格式或GLM实现，不进行任何删除/发布写盘。
- 2026-09-30 pal_supply_audit：独立只读取证交回真实分区/消费者/窄解码与反控清单；无文件修改、
  发布、测试或提交。Codex逐项核核心锚点，将counter与CLI恢复写盘边界合并进r1正文。
- 2026-09-30 Codex：用户要求推进；r2首批白名单与反控准入，隔离worktree就绪。原有E2E研究
  文档保留并单独落Git证据；本次不合入GLM L/M/N候选、不改其冻结源。
- 2026-09-30 Codex / pal_supply_audit：实际Node加载反证和独立源码证据收敛；Owner暂停宽
  barrel方案。r3改为现有纯叶author-io子路径，新增导入白名单后继续，不伪造浏览器接口。
- 2026-09-30 pal_author_check：交回705d07ec，隔离树干净；35项新增反控、作者定向回归与
  typecheck/格式自验通过。Codex另做源码复核、真实PAL/Node CLI与定向回归后本地集成。
- 2026-09-30 Codex / pal_supply_audit：r4首个分包候选被真实缺失入口反证拒收；r4.1正式
  产物/初始化器独立只读复核通过，Codex三入口真实冷启动通过。最终全仓check/零诊断通过，
  首批accept；母卡后续资源供应拆分与完整转换退役仍未完成。
- 2026-09-30 Codex：首批与质量收口已推送main `2db997df`；贡献者临时worktree已由管理工具
  归档为可恢复附件，已合本地分支`codex/pal-author-check-r1`删除，代码/历史保留在Git。
  保留既有E2E与GLM L/M/N工作树；主树干净，未删除任何产品/迁移代码。
- 2026-09-30 Codex / pal_supply_boundary：r5直接证据与真实纯内存反证支持窄供应；单Owner
  隔离白名单核定，依赖离线安装不改lock。第二批实现准入，不授权删除专用动作审计或完整转换核。
- 2026-09-30 pal_resource_supply / Codex：首个apply_patch误以为跟随shell工作目录，机械提取
  落在主树migrate-content及两新leaf。Owner立即暂停，将本次精确diff转入隔离绝对路径，
  用apply_patch逆本次diff恢复主树并撤出本次新建文件；未用reset/checkout，不触碰其它内容。
  Codex另核主树status干净/diff-check为空、隔离仅这三文件后允许继续；旧oracle此前已冻结。

## 下一位Agent提示词

接手任务：ARCH-PAL-SUPPLY-1，当前build，r6已准入；同贡献者pal_resource_supply在上述
隔离工作树/分支从冻结63aafb81续接。先完整读AGENTS.md、CLAUDE.md、READ-FIRST、本卡
r5冻结证据与r6精确白名单。用户已明确取消原版动作审计，按真实消费者删除完整核、死API及
专属测试，迁出实际静态类型/helper与mixed有效case；current项目/作者/地图/资产/事务测试全保留。
不改真实工程/baseline/覆盖率/配置/依赖或运行重导CLI；patch使用隔离绝对路径。交回干净
候选提交、删除/迁留case映射与自验日志。不得合main或标done；Codex独立比旧537文件oracle、
做只读作者门及全仓零诊断验收，不要求用户转发或代跑技术门。
