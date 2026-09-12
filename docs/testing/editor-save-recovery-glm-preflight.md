# 作者保存恢复：GLM 保存前校验与序列化测试包

父卡：[EDITOR-SAVE-RECOVERY-1](../ops/tasks/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md)，当前build，
沿用已签产品设计r2。本包revision为 **preflight-r1（2026-09-12）**，是实施期测试分工，不是新产品卡、不重签。
用户已要求给出提示词让GLM开始；GLM完成两组测试和一组只读盘点后一次性交Codex复核。

## 基线、隔离与责任

- 冻结代码与测试基线 **4b72e492**：完整check 6,711项、严格fast 6,223项，生产618文件；
  editor-fast 220生产文件/195测试文件/1,984项。该数值只作起点，回执须自行复算。
- 从本文件首次加入的派工文档提交建立新worktree/分支 `codex/glm-save-preflight-tests`，
  建议目录 `/Users/zhangxu/illegal/type-pal-glm-save-preflight`。可用git log的diff-filter=A定位派工提交；
  先核起点packages/scripts相对4b72e492零diff。若同名分支/目录已有内容，先查归属，不覆盖。
- 不复用已完成的glm-save-coverage-batch工作树，不回退main、不stash旧内容、不追着main更新产品基线。
  Codex负责原生跨页、性能与产品修复；GLM仅修改下列新测试和本人回执。接收时由Codex适配新主树。
- 不改产品/UI/schema/save/迁移/公共API/权限策略；不运行迁移、不操作用户6010或真实作者工程。
  发现真实产品缺陷保留最小可执行红用例并登记，由Codex判断；不因代码现状而削弱业务预期。

## 必读与已有成果

先读AGENTS.md、CLAUDE.md通用/阶段规则、docs/phase2/READ-FIRST.md、父卡r2红线/SR矩阵及最新交接，
以及[上批Codex接收与集成](editor-save-recovery-glm-batch-report.md#codex-d39efe15接收与集成2026-09-12)、
[覆盖率合同](coverage.md)、[工程生命周期](../phase2/specs/project-lifecycle.md)。
先核实际生产调用和类型，再构造合法输入；不把“覆盖率为零”当作“产品有bug”或“该分支一定可达”。

| 本包关注 | 4b72e492行 | 函数 | 分支 | 工作方式 |
|---|---:|---:|---:|---|
| project-io.ts | 268/290 | 49/52 | 191/241 | 保存前校验/序列化新增真实回归 |
| workspace-persistence.ts | 377/423 | 58/58 | 353/435 | 剩余分支只读分类，不写权限模型测试 |

复用真实buildBlankProject、toEditorState、serializeProject/serializeProjectWithMapCopies、
preflightProjectWriteSet、writeProject以及现有author-save-fixture/author-save-store-fixture。
**不新造或复制IDB/FSA/Web Locks替身，不mock掉被测函数、解码器、内容校验器或权限策略。**
上批W3上传未登记/输出冲突、W9精灵与战斗精灵坏格式、S1–S3/锁互斥已通过；只补剩余分支，不换名重复计贡献。

## A组：保存前校验（可写测试）

入口：project-io.ts:669–737的preflightProjectWriteSet，及writeProject真正调用它的位置。

| ID | 核验内容 |
|---|---|
| P01 | catalog大小与SHA各自不符：两个条件独立控制，另一项保持相符；合法原字节正控通过 |
| P02 | tileset非canonical gzip与gzip内部RLE损坏分开验证；坏字节的bytes/SHA必须如实更新，不能提前被摘要检查挡住 |
| P03 | 删除catalog仍引用的资源拒绝；合法解除引用后的删除与“本次同时有替换输入”按真实合同核实，不误判合法保存 |
| P04 | 合法部分写集、未入catalog的附属二进制等真实调用形态保留；不得把全部附属文件当作非法pending上传 |
| P05 | 至少一类新增失败穿过实际writeProject入口：同项目/同合法基线，错误注在待保存输入，明确错误层与全部副作用 |

P01/P02可先直接测纯预检；P05证明真实writer接线。不能把纯函数没有IO冒称所有保存入口都已验证。
每个kind先用同形状合法资产做正控；优先用blank自带资产，不依赖真实PAL目录或临时外部图像。

## B组：序列化完整性（先核当前模型可达性，再写测试）

入口：project-io.ts:211–342的serializeProject及:351起的地图copy-through包装。

| ID | 核验内容 |
|---|---|
| S01 | 当前合法脚本索引/分片/共享脚本按声明路径输出，正文内容保留；缺片/缺正文的实际拒绝层明确 |
| S02 | 已加载地图工作副本与未加载地图copy-through保留；地图index冲突/未登记对象若已有上游门禁则分类，不绕过门禁 |
| S03 | migrationDiagnostics按物品对应能力是否已修复作保留/移除，使用当前合法诊断结构，不能改迁移器或PAL产物 |
| S04 | manifest声明的内容表和可选缺席按现行合同输出；成功输出可经正式loader重开，不靠只断言对象键数 |

上述是核验问题，不预判所有源码分支都能由当前模型产生。若当前canonical模型/前置校验已经阻断某状态，
登记真实caller、阻断位置和可证伪观察；不要伪造旧content版本、删校验、cast出私有品牌或恢复已退役字段来刷覆盖。
正常用例优先走真实建项/载入/作者状态构造；合法状态的手工组装需说明与现行类型/调用约定一致。

## C组：权限策略剩余分支（仅只读证据清单）

以本基线完整editor-fast报告定位workspace-persistence未覆盖分支，再逐项读取真实调用链。
表格至少包含：报告分支位置/条件、file:line、生产调用方、前置守卫、已有测试全名与证据、
分类、可证伪输入/观察、建议下一责任人。

分类只用：`已有真实覆盖`、`当前入口可达且待测`、`前置校验已阻断/重叠护栏`、`待确认`。
“同型测试已绿”不是该分支证据；“需要构造边界”不是不可达证明。位置和分母来自本次报告，不沿用旧行号。
不暴露内部接口、不构造假的mutation/token、不为内部品牌表写第二套模型；本组不改产品、不新增权限测试。
若发现业务可达的真实安全风险，给最小调用路径/输入及只读证据，交Codex裁定，不自行扩实现范围。

## 白名单与验证纪律

仅可新增以下测试/窄helper（helper只组装输入与断言，不实现环境或产品协议）：

```text
packages/editor/src/core/save-preflight-boundaries.test.ts
packages/editor/src/core/project-serialization-boundaries.test.ts
packages/editor/src/core/__tests__/save-preflight-fixture.ts
```

文档只写**本文件末尾GLM回执**及父卡“GLM · preflight-r1交接日志”块，不改派工正文/他席/签字/Status/看板/README。
旧测试及其名字/断言、全部共享fixture、配置/超时/exclude、官方baseline和原探针保持零diff。

1. 每个失败输入先有同条件合法正控；明确期望在哪一层拒绝。如果先被别的门挡住，修输入或如实分类，不认作目标回归。
2. 真实writer拒绝要核逐文件字节快照、creates/closes/removes、凭据phase/planHash以及必要的进度/状态。
   字节比较用Uint8Array等明确视图；同字节重写也必须被IO轨迹抓住。纯序列化测试明确只证明输出或拒绝。
3. 至少4种有意义的单点负控，覆盖A/B两组。移除目标防护后，同一业务断言必须红；入口错误、插件未命中、超时不算。
   重叠防护导致仍绿时收窄证明范围/分类，不靠报错文案以外的空断言冒称新能力。
4. 异步注入用真实entered/deferred及finally清理；不sleep猜时间、不使用多数重跑判断。测试环境每例恢复原descriptor。
5. 两组测试/只读清单都完成后一次性交付；中途有一类真实不可达/待裁决不阻塞其余独立项，但不可伪填完成。
6. 先跑新测试+相邻project-io/project-copy/save-batch-writer及editor typecheck/改动文件biome；再串行跑完整pnpm check
   与独立临时目录中的同口径editor-fast（复用scripts/coverage/config.mjs的include/exclude/testSelection，220生产文件全纳入）。
   不同时跑两套重型质量门。不得运行ratchet或手改baseline，官方统一门禁留Codex接收时执行。
7. project-io尽量达到行/函数95%、分支90%；未达到时逐项说明真实可达缺口，不缩统计范围或制造无意义输入。
   C组是只读分类，不承诺本批把workspace-persistence提升到90%。
8. 完整check所需忽略资产先检查；如需借用现有资产，只能本地只读使用并记录环境准备，不提交本机链接。
   显式stage白名单；**最后一次文档回填提交后**核git ls-tree HEAD/git ls-files的data/extracted均为空、
   全部产品/脚本/旧测试对4b72e492零diff，并核git ls-remote等于最终推送SHA。不要用中间提交代替最终树证据。
9. 最终回执从实际候选生成：测试全名→P/S条目→业务结果/负控、C组逐分支表、覆盖整数分子分母/文件与用例数、
   每次失败的命令/退出码/真实原因、未做项及责任、精确diff与推送SHA。真实红用例不skip/todo；不把exit1写成通过。

## GLM回执（仅GLM填写）

**preflight-r1（2026-09-12），分支 `codex/glm-save-preflight-tests`，worktree
`/Users/zhangxu/illegal/type-pal-glm-save-preflight`，起点 88487350（packages/scripts 相对
4b72e492 零 diff 核过）。最终候选与推送 SHA 见交接节。**

### 实现与逐项证据

白名单实际改动：`save-preflight-boundaries.test.ts`（6 用例）、
`project-serialization-boundaries.test.ts`（5 用例）、`__tests__/save-preflight-fixture.ts`
（窄 helper：seed 资产清单/单记录 catalog 输入组装/记录单字段替换，不实现环境或协议）。

| ID | 结论 | 测试全名 | 关键断言 |
|---|---|---|---|
| P01 | 通过（2 用例） | P01: 大小不符独立拒绝…/P01: 摘要不符独立拒绝… | bytes+1 保持 sha 相符→拒；sha 换 64f 保持 bytes 相符→拒；同信息正控 resolves。两层错误同文案、由独立字段控制 |
| P02 | 通过 | P02: tileset 非 canonical gzip… | 非 gzip（摘要如实）→`瓦片集资源不是 canonical gzip`；真实 gzip 包裹垃圾 deflate（摘要如实）→`瓦片集资源 RLE 损坏`——两种拒绝分开验证 |
| P03 | 通过 | P03: 删除 catalog 仍引用的资源拒绝… | removePaths 指向仍被引用资源→拒；catalog 解除引用后同删除→合法通过（真实合同） |
| P04 | 通过 | P04: 非 catalog 管理的附属二进制… | 未登记路径的 ArrayBuffer 附属文件不被当作非法 pending，正控通过 |
| P05 | 通过 | P05: 精灵坏格式穿过真实 writeProject… | serialize 后 writeProject 真实入口拒绝 `/精灵资源 RLE 损坏/`；整份磁盘快照逐字节不变、creates/closes/removes 全空、凭据 phase=staging/planHash=null |
| S01 | 通过（2 用例） | S01: 分片脚本按声明路径输出…/S01: 声明 sharedScripts 缺失… | index.bytes 按生产合同（无缩进 JSON UTF-8 字节数）计算；缺 chunk 被**上游** assertScriptProjectValid 拒绝（`index chunk 缺文件`），serializeProject:287 同文案分支为重叠护栏——如实分类不绕过；sharedScripts 声明+缺失→序列化层拒绝 |
| S02 | 通过 | S02: 已加载地图输出… | copy-through 逐字保留 readText 原文；地图资产路径覆盖 index 被**上游** validateMapIndex 拒绝（`不得覆盖 map index`），serializeProject:264 为重叠护栏 |
| S03 | 通过 | S03: 物品对应能力未修复的诊断保留… | 合法 ItemData（equip 具备/use 缺席）+ 两条诊断：use→保留、equip→被移除；manifest 补声明 migrationDiagnostics 路径构造合法当前形态 |
| S04 | 通过 | S04: 声明的内容表按路径输出… | 必需表逐路径输出断言；可选表（enemies 族）缺席不产出；输出写内存目录后**经正式 loader 完整重开**（manifest id/actors 数量核对），非仅键数断言 |

**C组：workspace-persistence 剩余分支只读分类**（基线报告：本批同口径 editor-fast 197 文件/1,995 项，
wp 353/435 分支；未覆盖分支行从本次 coverage-final.json 提取，非旧行号）：

| 位置/条件 | file:line | 生产调用方 | 前置守卫 | 已有证据 | 分类 | 可证伪输入/观察 | 下一责任人 |
|---|---|---|---|---|---|---|---|
| marker 解析非 Error 文案 | wp:127 | inspectWorkspaceMetadata | try/catch 包裹 JSON.parse（Error 归一化） | P1 坏标记/IO 两用例 | 前置校验已阻断/重叠护栏 | parse 抛非 Error 需 JSON 实现退化——无业务输入 | — |
| bootstrap 拒绝无句柄 | wp:147 | sandbox 首存引导 | authorizeFirstSaveTarget 内部唯一调用 | P5 沙盒链 | 前置校验已阻断/重叠护栏 | 需伪造 mutation 身份——不构造 | — |
| allowPrivateFiles 路径前缀失配 | wp:172 | journal 暂存能力 | seal 前操作专属 | journal 17 项接收版 | 已有真实覆盖 | 同 op 目录外文件被拒 | 已覆盖 |
| recovery/plan 状态机拒绝（:234,257,260,304,337,341,347,360） | wp 各处 | recoverOwn/recoverInterrupted | ownedSaves/planHash 身份 | journal own-retry/凭据族（接收版） | 已有真实覆盖 | 换 operation/nonce/目录 | 已覆盖 |
| recordWrite/Remove/Seal/Register 的 active/dataFinalized 守卫（:485-553） | wp 各处 | journal 写路径 | mutation 品牌表 | journal 74+5 | 已有真实覆盖 | 伪造冻结后写入 | 已覆盖 |
| PAL proof 指纹族（:590-663，~14 分支） | wp 各处 | authorize PAL 目标 | createPalDevelopmentWorkspaceContext 构造 proof；open-actions:169-183 构造失败即抛 | O5/O6/P7 读侧 + open-workflows clone | 当前入口可达且待测 | PAL 目录指纹文件缺失/改动的**写侧**授权链（读侧已测） | Codex（PAL 原生/proof 构造属其保留域，或授权后另批） |
| metadata 矩阵（:568-598,689-718,823-843） | wp 各处 | authorizeBound/FirstSave | inspectWorkspaceMetadata 先归一化 | wp.test 31 项标记矩阵 | 已有真实覆盖（主路径）；深分支（sandbox+pal 同时 valid 等）待确认 | 构造互相冲突 marker | Codex 审查项 |
| recent/expectedIdentity 身份族（:698-743,940-1000） | wp 各处 | finishOpen/authorize | 上游 discovery 锁 | O3/O4 + recovery S3 接收版 | 已有真实覆盖（主路径）；record.handle 抛错等深分支已有 S3 补证 | isSameEntry 抛错/字段漂移 | 已覆盖 |
| resumesInterruptedAttempt 沙盒续存（:760-808） | wp | authorizeFirstSaveTarget | 首存授权状态 | journal 恢复+首存链 | 当前入口可达且待测 | 中断后重选同目录续存（需真实中断序列） | GLM 下批或 Codex 集成期 |
| 凭据/PAL 首存基线（:805-843） | wp | authorizeBound PAL | authorBaseline 必传 | B6/写侧 PAL 族 | 当前入口可达且待测 | PAL 绑定保存缺基线拒绝 | Codex（PAL 域） |

**C组汇总**：353/435 分支中未覆盖 82；按上表分类——已有真实覆盖（含上批接收）为主，
**当前入口可达且待测 3 族**（PAL 写侧指纹、沙盒续存、PAL 首存基线，均属 PAL/恢复深链），
其余为前置校验阻断或待确认深分支。本组按工作包未新增权限测试、未改权限模型。

### 验证、负控及范围

- 定向+相邻（save-preflight/project-serialization/project-io/project-copy/save-batch-writer）：
  **5 文件 44/44 绿**；新 11 用例含于其中。
- editor typecheck exit 0；三个新文件 biome 0 error（术语纪律修复：测试源不得出现「工程」，
  由 design-system boundary 静态门禁抓出并改正——这是真实失败不是环境）。
- 完整 `pnpm check` **exit 0 共 6,722 项**（/tmp/glm-preflight-workspace/full-check5.log）。
  环境准备：worktree 本地 symlink `data` → 主仓 gitignored 资产、拷贝
  `projects/pal/assets/migrated`（git check-ignore 证实忽略）——均为本地只读借用，不入提交；
  终树核验见交接节。
- 同口径 editor-fast（复用 config.mjs include/exclude/testSelection）：**197 文件/1,995 项全绿**，
  project-io **行 282/290（97.2%✓）/函数 51/52/分支 202/241（83.8%）**——行/函数达标，
  分支未达 90%；缺口逐项（下）。workspace-persistence 353/435（81.1%）为 C组只读对象不承诺。
- **project-io 分支缺口分类**（39 未覆盖，主要三类）：① journal/恢复状态机与 writeProject 接线
  （:404,512-629 约 15 处）——由已接收的 save-batch/journal 测试族覆盖于集成树，本 worktree
  不含那批文件（本分支仅两新文件），集成后按 Codex 报告合并计算；② 重叠护栏
  （:246,264,277,287 serialize 层同文案分支，上游 validate* 先拒——S01/S02 已如实分类）；
  ③ 未初始化可选字段 `??` 默认臂（:299-314 约 12 处）——需 enemies/shops/poisons 等表
  存在/缺席双态构造，属合法可达但本批未做，列为剩余（不伪造状态刷覆盖）。
- **四个单点负控**（/tmp/glm-pf-nc.config.mts 可重建，每针唯一匹配）：
  - ncA1 移除「资源二进制与 catalog 不符」守卫 → **P01 两用例红**（exit1，red=2）；
  - ncA2 中和「删除仍引用资源」守卫 → **P03 红**（resolved instead of rejecting）；
  - ncB1 内容表输出不再按声明过滤 → **S04 红**（`expected ['content/enemies-default.json'] to deeply equal []`）；
  - ncB2 诊断过滤恒真 → **S03 红**（已修复诊断仍输出，长度断言失败）。
  正常实现同测试全绿；无入口错误/插件未命中/超时。
- 真实产品缺陷：**无**。真实失败记录：术语门禁 1 次（已修）、未用变量 lint 1 次（已修）、
  full-check 前三次 exit1 分别为缺 data raw 资产、缺 migrated 资产、上述术语/ lint——均为环境/测试
  自身问题并已解决，最终 exit0。

### 交接

GLM 为测试贡献者。候选 `<回填>`；推送并核 `git ls-remote --heads origin
codex/glm-save-preflight-tests` 与最终 SHA 一致后交 Codex。最后一次提交后核
`git ls-tree HEAD -- data/extracted`、`git ls-files data/extracted` 均空、对 4b72e492 产品/脚本
零 diff。不代签、不标 done；原生/性能/最终审查留父卡收口。

**Codex 接收提示词**：

```text
在 /Users/zhangxu/illegal/type-pal 接收 EDITOR-SAVE-RECOVERY-1 的 GLM preflight-r1：分支 codex/glm-save-preflight-tests（远端 SHA 见回执交接节），起点 88487350，产品/脚本相对 4b72e492 零 diff。
交付：A组 P01–P05（save-preflight-boundaries 6 用例：大小/摘要独立拒、tileset gzip 与 RLE 分开、删除引用/解除、附属二进制、真实 writer 全副作用）+ B组 S01–S04（project-serialization-boundaries 5 用例：脚本 index.bytes 生产合同/copy-through 逐字/诊断能力过滤/正式 loader 重开；上游重叠护栏如实分类）+ C组 wp 剩余分支只读分类表（3 族可达待测归 PAL/深链）。四负控（A/B 各 2）全部业务红。
验证：定向+相邻 44/44、tc 0、biome 0、完整 check exit0 6,722 项、同口径 197/1,995 全绿；project-io 行 97.2%/函数达标、分支 83.8% 缺口已三类逐项列明。请复核断言与负控（/tmp/glm-pf-nc.config.mts 可重建）、适配主树集成并统一 ratchet/严格 fast。GLM 测试贡献终审披露；不代签、不标 done。
```
