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

尚未开始；不得把计划条目数或基线数字写作本人已跑结果。

### 实现与逐项证据

待填写P01–P05、S01–S04与C组表；允许分类，不允许空白或以总通过数替代。

### 验证、负控及范围

待填写，记录最终树和日志路径；临时脚本需可重建，不能只给/tmp地址。

### 交接

GLM为测试贡献者，不是本卡独立终审席；不代签、不标done。完成后给Codex接收提示词，
由Codex独立复核、适配集成、跑全仓ratchet/单次严格fast；原生/性能/最终审查仍在父卡统一收口。
