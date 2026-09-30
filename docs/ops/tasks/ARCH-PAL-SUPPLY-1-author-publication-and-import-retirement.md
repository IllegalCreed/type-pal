# ARCH-PAL-SUPPLY-1 — 作者发布与PAL导入职责拆分、脚本转换退役

Status: build
Phase: phase2
Capability: A7（现有内容供应链治理，不新增能力格）
Coding Owner: pal_author_check（首批隔离实现）
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Contributor: pal_supply_audit（r1只读准备）、pal_author_check（r2首批实现）
Branch: codex/pal-author-check-r1

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
视觉N/A：不改显示或剧情；001/002流程仍由E2E母卡负责，本卡不冒充剧情验收。

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

## 交接记录

- 2026-09-30 Codex：用户批准职责方向；开draft卡，首批只读核资产/静态表与脚本推导依赖。
  不改产品、生成内容、格式或GLM实现，不进行任何删除/发布写盘。
- 2026-09-30 pal_supply_audit：独立只读取证交回真实分区/消费者/窄解码与反控清单；无文件修改、
  发布、测试或提交。Codex逐项核核心锚点，将counter与CLI恢复写盘边界合并进r1正文。
- 2026-09-30 Codex：用户要求推进；r2首批白名单与反控准入，隔离worktree就绪。原有E2E研究
  文档保留并单独落Git证据；本次不合入GLM L/M/N候选、不改其冻结源。
- 2026-09-30 Codex / pal_supply_audit：实际Node加载反证和独立源码证据收敛；Owner暂停宽
  barrel方案。r3改为现有纯叶author-io子路径，新增导入白名单后继续，不伪造浏览器接口。

## 下一位Agent提示词

首批Owner在上述隔离目录读取本卡r2、AGENTS当前模式、CLAUDE阶段声明、READ-FIRST及pnpm/
Vitest技能，独占白名单内实现只读作者检查入口。复用现有作者保存校验核及save-state门，不重复
造validator，不改PAL重导/剧情/生成目录/覆盖率。按r2反控自测、零诊断格式/typecheck，提交候选后
向Codex交文件清单、命令/结果与风险；不合main、不标done、不写用户工程。Codex独立复核集成。
