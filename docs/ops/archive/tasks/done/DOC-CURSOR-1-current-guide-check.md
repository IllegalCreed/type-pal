# DOC-CURSOR-1 — 十二份现行文档的轻量核对

Status: done
Owner: Codex
Contribution Owner: Cursor（文档只读取证，不占三贤人席位）
Reviewer: Codex
Phase: ops
Capability: 文档维护准备；不改变能力格
Visual Verification Timing: N/A
Branch: codex/cursor-docs-hygiene-r1

Revision: r1
Evidence freeze: a3ceaf05

## Codex 收口（2026-09-25）

本卡唯一交付是只读审计材料；正文 `65193a84` / 登记 `320800ec` 已独立 accept，且
[`cursor-docs-hygiene.md`](../../../../testing/cursor-docs-hygiene.md) 在 main 与该候选逐字一致。
用户现行规则为审过即集成推送，Codex 据此核定本只读卡 done 并归档；下文 draft/不合 main
均为当时交接边界。H1–H6/N1/T1 的五份正式指南纠错已在 DOC-GUIDE-REVISION-1 收口，
H7 另在 DOC-CURSOR-4 收口；本卡不冒充产品修复或浏览器验收。无下一位 Agent 提示词。

## 目标与边界

用户2026-09-25询问可交给Cursor的简单并行工作。本包只核现行指南的命令、引用与准备说明，
交一份可直接据以修改的建议表；不改产品、不补测试、不做视觉，不与GLM十二组回归实验重叠。
立即可执行的是draft只读核对，不是正式文档改写或产品build。无需安装依赖、起服务或跑覆盖率。

## 前提与上下文

- 先读AGENTS/CLAUDE/READ-FIRST及[文档维护规则](../../../guides/documentation.md)。
- `docs/ops/guides/documentation.md:59-71`与`scripts/docs/markdown.mjs:3-27`：既有检查器不核
  代码围栏内命令、行内路径、标题锚点及叙述真实性。本任务补静态人工核对，不重造文档检查器。
- `package.json:6-23`、各包`package.json`、Vite配置与真实符号定义是命令/路径证据；
  核到脚本存在仅能写“静态对齐”，不能写“启动/业务通过”。
- 玩法/视觉/格式前提门N/A：不判断或改变这些合同。若涉及机制或政策歧义，只记待确认。
- 最强替代解释：被引用的段落是历史快照、未来计划、示例占位或gitignored生成物。
  必须先判时效和上下文；不能将文件本机缺席、旧行号漂移或历史版本数字直接报为缺陷。

## 固定检查范围（十二份，不递归扩成全仓审计）

1. `README.md`
2. `docs/README.md`
3. `docs/ops/guides/dev-servers.md`
4. `docs/ops/guides/browser-verification.md`
5. `docs/ops/guides/documentation.md`
6. `docs/testing/coverage.md`（只核现行操作段，不改时点统计）
7. `docs/phase2/README.md`
8. `docs/phase2/specs/editor-architecture.md`（只核目录/符号，不重审架构）
9. `docs/phase2/guides/debug-tools.md`
10. `docs/phase2/guides/content-publication.md`
11. `docs/phase2/guides/shared-script-author-guide.md`
12. `docs/phase2/guides/scene-entry-authoring.md`

四组连续做完：

- C1 命令：核cwd、workspace包名、script名、参数、默认端口/工程与环境变量来源；只读命令定义，
  **不执行文档中的命令**，尤其extract/migrate/bake/部署/发布/删除。
- C2 代码引用：核行内代码、树形目录和围栏中的源码路径/符号；若职责迁移，用当前定义/调用者定位替代。
  单纯行号漂移不逐条报错，目标符号已移走或描述指错职责才记录。
- C3 导航：手查范围内标题锚点和现行入口是否误导到旧方案；普通文件断链交既有检查器。
  不按个人偏好重排目录、不移动删除文件、不修改历史签字和旧结论。
- C4 初次准备：核各命令是否需要原版/提取/迁移资源、已构建包或安全上下文，现行说明是否漏前提。
  使用git跟踪/ignore规则和脚本读路径判断；不复制资产、不重迁、不修环境，也不声称完成fresh clone实测。

## 交付与验证

唯一可写文件：[Cursor核对回执](../../../../testing/cursor-docs-hygiene.md)。
每个问题一行：ID / 文档锚点与短原文 / 当前一手证据锚点 / 建议替换文字 / 确定性。
分类为“确定不符 / 待确认 / 历史或示例不改”；相同根因合并。另列十二份检查完成情况，
无问题也如实记已核；不设发现数指标，不加JSON机账或扫描框架。

- 创建独立worktree `/Users/zhangxu/illegal/type-pal-cursor-docs`；路径/分支存在则先核归属，不覆盖。
  从包含本卡的Codex交付提交起步，证据固定在a3ceaf05；不在main或GLM目录切分支。
- 可用rg/git/文件读取。仅允许运行`node scripts/docs/check.mjs`和`git diff --check`作交付验证。
  不跑全仓check、测试、覆盖率、浏览器；不操作stash、其它分支或worktree。
- 候选对起点diff必须恰为回执一个文件；检查正文所列证据都能在冻结树找到。
- 整包完成后一提交推到本人分支，给Codex commit SHA、确定问题数和待确认项。
  若无推送权限如实说明，保留本地提交；不改共享看板/任务卡，不合main、不代签、不标done。

## 推进签字与交接

- Codex：2026-09-25确认只读核对范围与GLM/Codex产品工作互斥；draft准备可执行。
- build准入：not opened；本卡不授权修改十二份源文档，后续由Codex审核建议并决定修订范围及准入。
- Kimi/GLM：本次不请求签字，亦不伪造豁免或accept；Cursor不代替任一席位。
- 材料接收：正文65193a84/登记320800ec已由Codex签accept，见文末席位；不等于正式文档已修。
- done准入：not opened，按用户本轮边界不标done、不合main；五份修订卡另核。

## 下一位Agent提示词

以下为原始准备阶段交接；文末窄返工也已接收，仅保留历史，不再授权重复执行。

```text
在type-pal接手DOC-CURSOR-1，先读AGENTS/CLAUDE/READ-FIRST、任务卡
docs/ops/tasks/DOC-CURSOR-1-current-guide-check.md和文档维护规则。
从Codex本次交付提交创建独立worktree /Users/zhangxu/illegal/type-pal-cursor-docs，
分支codex/cursor-docs-hygiene-r1；证据冻结a3ceaf05，勿在main/GLM目录切分支。
连续核完卡内十二份文档的C1命令/C2代码引用/C3导航/C4初次准备。
唯一写入docs/testing/cursor-docs-hygiene.md；交具体原文、真实源码锚点与可用替换文字，
区分确定不符、待确认、历史/示例不改；不设发现数，不写大报告或新扫描框架。
只读命令定义，不执行被审命令；不改产品/正式文档/测试/资产/配置/基线，不起服务、不跑覆盖率。
仅跑node scripts/docs/check.mjs及git diff --check，核diff恰一文件后提交推送本人分支。
不改任务状态、不代签、不标done；给Codex一段接收提示词，附SHA和剩余疑点。
```

## Codex首轮接收席位 — 2026-09-25（历史）

候选650f9f9d / 登记8f3b85a7：**counter，仅CR-1/CR-2**，留draft，不合main、不标done。
[独立复核](../../../../testing/cursor-docs-hygiene-review.md)确认一文件白名单/生产零改和H1～H6；
T1裁定删除旧URL括号；H7引用未被当前场景页渲染的ScriptTree，N1两种命令等价结论被真实argv反证。
Cursor原文未改，没有代签；只收本包回执，不带入其它工作。候选docs检查和diff检查均通过，不替代事实核验。
[五份源文档修订](DOC-GUIDE-REVISION-1-current-entrypoints.md)另开draft，build仍未开放（历史记录；该修订卡随后已集成收口）；
场景入场说明不做H7建议替换，后续由Codex核定真实UI。

### 首轮下一位Agent提示词（历史；返工已接收）

```text
在原独立worktree/分支codex/cursor-docs-hygiene-r1修DOC-CURSOR-1回执，原候选650f9f9d/tip8f3b85a7。
先读Codex复核分支codex/doc-cursor-review-r1中的
docs/testing/cursor-docs-hygiene-review.md及任务卡本席CR-1/CR-2。
无需合入Codex准入文档，直接git show读取即可；证据冻结a3ceaf05不变。
唯一写入docs/testing/cursor-docs-hygiene.md：
CR-1撤销H7把ScriptTree文案/按钮当当前界面的判断，按真实App→SceneScriptWorkspace→
ScriptSceneHookInspector→CanonicalScriptFlowEditor链记待核，不浏览器、不改产品。
CR-2更正N1：pnpm run migrate:content -- --write多传一个--，现行CLI拒绝；
README/content-publication短写保持，dev-servers两处列需删除多余分隔符，推荐run migrate:content --write。
不要跑真实迁移验证，可引用Codex真实argv/参数门反证；同步完成表/小计。H1～H6不重做，T1删旧URL括号。
仅跑文档检查与diff检查，确认仍只改回执一个文件后提交推送；不改正式指南/共享卡/状态，不合main、不代签、不标done。
交回新的候选SHA；Codex再核原卡接收及另卡五份文档修订准入。
```

## Codex当前接收席位 — 2026-09-25

正文65193a84 / 登记320800ec：**accept，仅审计材料接收**。CR-1/CR-2真实闭合，无剩余counter；
H1～H6逐字未变，H7待核当前UI，T1删旧URL括号，N1多余分隔符建议已纠正。
12 ID唯一，小计8确定/1待核/3保持；一文件白名单及冻结锚点核对通过，候选文档门/diff检查exit0。
详见[复核报告当前结论](../../../../testing/cursor-docs-hygiene-review.md)。Cursor原文原样接收，未代签，
独立复核分支承载回执与本人记录，main仍未合入。Status保持draft；不标done，不把材料accept用于修订卡开门。

交接：无下一位Agent提示词，Cursor本包无剩余返工，等待用户决定另卡五份文档修订准入。
