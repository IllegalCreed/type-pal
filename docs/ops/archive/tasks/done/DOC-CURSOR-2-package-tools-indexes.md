# DOC-CURSOR-2 — 十二组包说明、CLI与索引核对

Status: done
Owner: Codex
Contribution Owner: Cursor（机械核对与修订建议）
Reviewer: Codex
Phase: ops
Capability: 文档维护准备；不改变能力格
Visual Verification Timing: N/A
Branch: codex/cursor-docs-wave2-r1

Revision: r1
Evidence freeze: dab017e7

## Codex 收口（2026-09-25）

本卡唯一交付是十二组包说明/CLI/索引的只读审计材料；正文 `4b75d1c3` / 登记
`cc2720c5` 已独立 accept，且 [`cursor-docs-wave2.md`](../../../../testing/cursor-docs-wave2.md)
在 main 与该候选逐字一致。NB1/NB2 两处非阻断文字观察仍以 Codex 接收报告的准确锚点为准。
用户现行规则为审过即集成推送，Codex 据此核定本只读卡 done 并归档；下文 draft/不合 main
均为历史交接边界。回执中的源文档修订建议**并未因本卡 done 自动实施**，后续按具体文档范围另核。
无下一位 Agent 提示词。

## 目标与授权

用户2026-09-25要求“再给他一大波简单任务”。本包拆成十二组，Cursor可连续做完再整包交回，
只核能由文件、脚本定义、导入和目录直接证明的事实，**不重审架构、不写产品、不启动服务**。
这是draft只读准备，不是正式文档build。上批DOC-CURSOR-1材料已经accept；五份修订卡仍未开放，
不借新分配改写前批指南。GLM十二组测试/视觉与Codex架构实现均保持原Owner和边界。

从包含本卡的新提交创建独立worktree `/Users/zhangxu/illegal/type-pal-cursor-docs-wave2`，
分支`codex/cursor-docs-wave2-r1`。本卡暂在Codex复核分支交付，**不得为取工作包合main**。
路径/分支若已存在先核归属和工作树，不覆盖、不操作其它worktree/stash。
新提交相对dab017e7只有分配文档；证据始终用dab017e7，避免把后续重构行号混入冻结报告。

## 必读与判断纪律

- AGENTS/CLAUDE/READ-FIRST、[文档维护规则](../../../guides/documentation.md)、
  [前批独立接收](../../../../testing/cursor-docs-hygiene-review.md)。根协议是约束，不在本包改写范围。
- 前提门N/A（不变更行为/机制/格式）：本包只判断操作说明与现有定义是否一致，不评判产品应如何实现。
- `documentation.md:59-71`：普通断链/目录漏项已有机器检查；重点补围栏命令、行内路径、标题锚点和明确叙述。
- 前批教训：字符串或export存在不等于当前UI/caller会使用；命令写法不能凭旧README互证。
  不确定参数转发则记待核，引用前批真实argv反证即可，不再次执行迁移。
- 最强替代解释：历史快照、设计目标、示例占位、gitignored输入、dev/test-only依赖；逐项排除后才报确定不符。
  “源码用了X”不自动证明“规范该改成X”，有政策冲突列待裁决，不让文档迁就未经审查的代码。

## 十二组固定工作

C01～C07每组交一张小表：文档中的命令→真实package.json script→入口文件；
明确目录/符号→真实定义或当前调用；输入/输出→已跟踪/ignored/外部。只核文档明确声称的内容，
不要求给全部导出API写手册，不以scripts未全部列在README为错误。

| 组 | 固定主目标 | 简单核对点和边界 |
|---|---|---|
| C01 shared | `packages/shared/README.md` | 命令、src/index.ts实际导出、被文档点名的资产类型；不审解码算法/领域模型 |
| C02 pal-extract | `packages/pal-extract/README.md` | extract/extract:videos脚本、原始/输出路径、ffmpeg调用与输入要求；不执行提取、不考证原版机制 |
| C03 game | `packages/game/README.md` | dev/test/e2e命令与端口；“只修阻断、不再架构演进”与CLAUDE现行授权是否冲突；已知e2e退役关联前批H1，不再算新根因 |
| C04 content | `packages/content/README.md` | 常量定义路径、当前数值、具名validator/引用入口及命令；只对符号，不审schema字段或旧版本政策 |
| C05 reforge | `packages/reforge/README.md` | dev默认工程/端口、test/typecheck、被点名运行入口/依赖边界；源码导入区分产品/test/dev，不因间接依赖乱报跨包违例 |
| C06 editor | `packages/editor/README.md` | dev/test/maxWorkers/typecheck/audit脚本；声明依赖与package.json/真实生产导入区分；不验证UI功能，不把既有设计目标直接判为应该删除 |
| C07 migrate | `packages/migrate/README.md` | 目录职责是否有真实文件、命令参数、默认流程是否先recover；不审事务算法。前批N1只作已知关联，不声称默认dry-run绝无任何写副作用 |
| C08 迁移CLI说明 | 下列六个migrate scripts | 逐个列参数解析/默认值/输入与输出/cwd/外部工具/顶层调用；没有帮助文案不算bug；未能证明的副作用写unknown |
| C09 提取与文档工具说明 | 下列五个脚本 | 同C08；只读usage/header与实际参数解析/调用，不运行help、导入模块或尝试错误参数 |
| C10 CI命令映射 | `.github/workflows/docs.yml`、`.github/workflows/coverage.yml` | 触发条件、Node/pnpm声明、执行cwd/脚本存在、报告路径、保护基线env的真实消费者；不远端触发、不评安全性、不改workflow、阈值或超时 |
| C11 资源/fixture说明 | 下列四份文档 | 明确文件路径/生成者/跟踪状态/声明hash可核性；无本地输入如实未核。不考证版权、改license、下载素材或做剧情/视觉验收 |
| C12 目录入口 | 下列八份README | 对当前目录直接文档的导航名称、目标/标题锚点、current/historical标注；仅打开目标核标题和归属，不扩成全文审计，不按个人喜好重排目录 |

### C08六文件

```text
packages/migrate/scripts/audit-pal-sprite-actions.mts
packages/migrate/scripts/audit-project-maps.mts
packages/migrate/scripts/bake-assets.mts
packages/migrate/scripts/generate-project-battle-placeholders.mts
packages/migrate/scripts/migrate-content.mts
packages/migrate/scripts/preview-fbp.mts
```

### C09五文件

```text
packages/pal-extract/scripts/extract-videos.ts
packages/pal-extract/scripts/find-scenes-without-setpartypos.mjs
packages/pal-extract/scripts/grep-sdlpal-chunks.ts
scripts/docs/check.mjs
scripts/docs/relocate.mjs
```

### C11四文件

```text
data/raw/README.md
projects/e2e-own/README.md
projects/pal/e2e-checkpoints/README.md
packages/reforge/src/engine-chrome/assets/PROVENANCE.md
```

data/raw与checkpoint的带日期数量/剧情验收属于历史，不按现在文件数改历史；只判当前操作是否缺前提。
PROVENANCE只核明确指向的已入库文件存在性/散列，以及aggregate有足够算法定义时的可复算性。
缺原始输入记“未核输入”，不判hash错误；不把相同hash解读成权利已获授权。

### C12八文件

```text
docs/ops/README.md
docs/ops/guides/README.md
docs/ops/audits/README.md
docs/ops/templates/README.md
docs/phase2/guides/README.md
docs/phase2/specs/README.md
docs/phase2/reference/README.md
docs/phase3/reference/README.md
```

前批十二份源文档、五份修订白名单、H7真实UI问题、历史审计回执/签字不重新领；C12引用这些文件时只查导航。
例如game README重复e2e说明，可报“已知H1新增位置”，不得重算发现数或回头重跑H1证明。

## 唯一交付与轻量执行

唯一可写文件：[十二组回执](../../../../testing/cursor-docs-wave2.md)。沿用一份报告，不新增JSON机账、探针框架或十二份重复总结。

- C01～C12各一节：列核过的事实小表和未核边界；明确不符才展开原文→一手证据→建议替换文字。
  每个建议需可直接使用，不写“建议更新文档”空话。没有问题则简述静态已核，不强凑数量。
- 分类：`确定不符 / 待确认 / 已知关联 / 历史或示例不改 / 未核输入`；不同出现位置与独立根因分别统计。
  每条稳定ID、冻结file:line、短原文、证据定义/调用位置；待确认给一个最小证伪办法，不替用户裁决。
- CLI的“静态参数/路径匹配”不写为“运行成功”；CI的脚本存在不写为CI已绿；hash匹配不等于视觉正确。
- 允许rg、git、文件读取、shasum或自包含只读Node表达式做机械计数。除下条既有文档检查器外，**不执行被审脚本/帮助命令**，
  不import CLI，不install/升级依赖，不访问用户浏览器/存档，不执行extract/migrate/bake/relocate/发布。
- 正式验证只运行`node scripts/docs/check.mjs`与`git diff --check`；不用全仓check、typecheck、测试或覆盖率。
  缺输入的组记录后继续，不修本地环境、不在别人的worktree取成果冒充本次执行。
- 每四组提交一次，三段连续完成；最终回填一次正文候选SHA，登记提交与内容提交分开。整包push交Codex，
  不逐组等待签字。按实际表格生成小计；相对开工提交的diff只能有本回执。
- 不动packages/scripts/.github/projects/data或正式指南，不改共享卡/看板/状态，不合main，不代签、不标done。

## 推进签字与日志

- Codex：2026-09-25确认十二组draft只读范围与现有并行工作无产品写冲突；定义上述核对合同。
- Kimi/GLM：本次不请求，不代签；Cursor不是其替补席位。
- build准入：not opened，源文件修订仍需另核；本包只允许回执事实核对。
- 材料接收：4b75d1c3/cc2720c5已由Codex签accept，含两条非阻断文字观察，见文末。
- done准入：not opened，用户本轮要求不标done、不合main。本包不自动扩大前批五份修订范围。
- 交接：本工作包在Codex复核分支交付；遵守前轮不合main边界，原卡材料accept不受影响。

## 下一位Agent提示词

以下为原始分配，文末首轮返工也已完成接收，仅作历史保留，不授权重新执行十二组或重复返工。

```text
接手DOC-CURSOR-2，先读AGENTS/CLAUDE/READ-FIRST、
docs/ops/tasks/DOC-CURSOR-2-package-tools-indexes.md、文档维护规则和前批接收结论。
从Codex给出的本次提交新建独立worktree /Users/zhangxu/illegal/type-pal-cursor-docs-wave2，
分支codex/cursor-docs-wave2-r1；勿在main/旧Cursor/GLM目录切分支，存在时先核归属。
证据冻结dab017e7，按卡连续完成C01～C12：七包README、十一CLI、两CI、四资源文档、八索引。
唯一写入docs/testing/cursor-docs-wave2.md，每组事实小表+确切修订建议；已知H1/N1只记新位置，
H7真实UI与前批源文档不重审。优先核真实定义/调用，不以字符串存在证明UI可达，不凭旧文档证明命令等价。
除node scripts/docs/check.mjs外不执行被审CLI/help，不安装依赖、不改产品/正式指南/配置/资产/基线，不起服务、不跑测试/覆盖率。
只跑文档检查与diff检查；每四组提交、十二组连续完成后统一push。最终diff恰回执一个文件。
不改共享卡/状态，不合main、不代签、不标done；交正文SHA、登记tip、分组完成状态及给Codex的接收提示词。
```

## Codex首轮接收席位 — 2026-09-25（历史）

正文3852afe5 / tip e3da44ca：**counter，R1～R4只限回执**。一文件白名单/生产零漂移及文档门通过，
已入库资源散列独立复算一致；不能把这些通过当作分类和替换句正确。
[独立复核](../../../../testing/cursor-docs-wave2-review.md)给出三条误报、C07替换承诺、冻结锚点/CLI cwd及未核分类反证。
Cursor原文原样保留，已核事实不重开；本卡留draft，不代签/不标done/不合main。
DOC-CURSOR-1材料accept保持，DOC-GUIDE-REVISION-1仍未开放，本包不扩大前批修订准入。

### 首轮下一位Agent提示词（历史；已接收）

```text
在原分支codex/cursor-docs-wave2-r1修DOC-CURSOR-2回执；原候选3852afe5/tip e3da44ca，证据冻结dab017e7。
先git show读取Codex原复核分支的归档标签archive/doc-cursor-review-r1上的
docs/testing/cursor-docs-wave2-review.md与本卡Codex席位，无需合入共享卡/看板。
唯一写入docs/testing/cursor-docs-wave2.md，按R1～R4：
R1撤销C01缺shared/assets即引用错误的推断，纳入Reforge assets/index真实消费者；
C12两个正确短名导航不按“不等H1”计缺陷，不要求改成长标题。
R2修C07可执行替换句：当前发布指南没有烘焙细节，不再承诺其提供；可只链接PAL发布入口。
R3按冻结树校准七包证据行号/键名，补C09 cwd及preview显式相对out的cwd区别，修裸竖线表格和LF配方表述。
R4未运行迁移/未起服务移到未执行边界，不算未核输入；同步分类、小计、ID去向，勿凑发现数。
已核C03政策冲突、C11跟踪例外、资源hash与其他事实不重做；C05保持待核，不跑视觉/CLI/CI/覆盖率。
仍只跑文档检查/diff检查，最终相对7e52d514仅本回执；提交推送，给Codex正文SHA及登记tip。
不改原指南/产品/配置/基线/共享任务卡，不合main、不代签、不标done；五份修订准入不因本包打开。
```

## Codex当前接收席位 — 2026-09-25

正文4b75d1c3 / tip cc2720c5：**accept，仅审计材料接收**，无剩余阻断counter。
R1/R2/R4已闭，R3关键锚点/cwd修订已完成；pal-extract一处7/8行定位与preview表格少格列为
[NB1/NB2非阻断文字观察](../../../../testing/cursor-docs-wave2-review.md)，不伪称回执零瑕疵，不再要求整轮文字返工。
小计3/1/2/1/4/2与16 ID去向机械核对一致；一文件白名单/文档门/diff门通过。
Cursor原文原样接入独立复核分支，本人仅签Codex席位；未重跑已核事实或资源hash。
Status保持draft，不合main、不代签、不标done；五份前批指南修订卡仍不因本包打开。

交接：无下一位Agent提示词，Cursor本包无剩余阻断返工，等待用户决定后续文档修订准入。
