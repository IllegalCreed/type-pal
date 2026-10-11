# TEST-EDITOR-SCRIPT-INTERACTION-1 — 当前脚本编辑器交互与草稿生命周期

Status: done
Owner: GLM（新对话A，唯一测试写入者）
Reviewer: Codex（独立验收）
Phase: phase2
Capability: editor / canonical script interaction
Visual Verification Timing: N/A（代码/DOM合同，不改布局，不宣称截图/像素或剧情E2E验收）

## 目标和路由

当前脚本编辑器交互与草稿生命周期。仅本卡A1–A10，每轴有直接证据和裁决即停止；不滚动扩围，不设例数、针数或覆盖率目标。

- 工作树 `/private/tmp/type-pal-editor-script-interaction.fgkhat/type-pal`；分支 `codex/glm-editor-script-interaction-r1`。本卡派发文档提交建树，产品冻结 `797a46a097640206a12b8f61dc014c8db277e457`。
- 推荐执行模型GLM-5.3，用户手工选择；贡献者不得自行切换套餐/权限。无需视觉模型。
- 先读[共同交付协议](../../../evidence/TEST-CONTRACT-BATCH-20261008/README.md)和[冻结及白名单](../../../evidence/TEST-CONTRACT-BATCH-20261008/targets.json)、[第二阶段纪律](../../../../phase2/READ-FIRST.md)、[测试质量验收](../../../agent-workflow.md)。

## 前提与源码锚点

产品/schema/UX不改变，原版机制前提门N/A；本卡只检查当前实现的公开合同。编码前核源码条件与旧实际断言；最强替代解释是旧测已证、前置guard抢先拒绝或caller无法合法产生输入。任一成立则登记而不造新测试。

- ScriptEditor.tsx:1100–1248 当前CommandRows，键盘/行操作、嵌套scope、重排意图；:3427–3645 CanonicalScriptBodyEditor，外部内容身份、草稿、定位token与commit拒绝。
- SharedScriptTab.tsx:309–319 真实canonical caller，onChange由当前会话保存；CanonicalScriptBodyEditor的onChange是void，不把“返回false”虚构成拒绝协议；真实拒绝必须throw。CanonicalScriptFlowEditor的boolean协议另列，不混淆。
- ScriptEditor.test.tsx:479–525已证嵌套重排及外部undo/redo清选择；:1194–1286已证每revision定位/旧path；:1288–1332已证同值重渲染不丢待执行定位。以上只登记existing-proof，不复刻。
- author-command-edit.test.ts / .boundaries.test.ts、ScriptEditor.cov85 / unified-steps / coverage-workflows-2与SharedScriptTab旧测全文排重。
- ScriptTree旧组件没有成为本卡新增合同的current caller；只允许读取摘要辅助函数，不为保覆盖率补旧runtime命令视图。

## 有限工作清单

| 轴 | 合同域 | 必须完成的裁决 |
|---|---|---|
| A1 | 当前正文拒绝协议 | 区分void/throw的BodyEditor与boolean的FlowEditor；调用路径/合法输入/旧断言账。核心helper已有合同只登记。 |
| A2 | 定位帧淘汰 | 同一正文在旧RAF尚未执行时收到新revision，旧帧不得覆盖新定位；控制外部RAF队列，实际focus/scroll/选择为oracle，不手写组件算法。 |
| A3 | 外部替换时编辑草稿撤销 | 公开props替换同位置不同命令时，旧编辑草稿不能提交到新命令；合法共享脚本切换/undo路径与定位pending分开。 |
| A4 | 外部替换时插入面板撤销 | 打开插入后外部内容真正变化，不向过期path插入；与同值新引用重渲染区分，后者不能误当变化。 |
| A5 | 被拒复制 | onChange真实抛错时不选择虚假的复制结果、不改变原body，精确onError；重试合法成功另有输入身份。 |
| A6 | 被拒删除 | 删除提交被拒时原选择/草稿与正文不误消失，错误可观察；不用只断言mock调用数。 |
| A7 | 被拒重排 | nested scope下拒绝commit，不能移动内部reorder key或错误映射选择；用真实Ds控件，保留已证成功/undo为existing-proof。 |
| A8 | 键盘事件域 | 行本身Enter/Space选择，与子按钮/选择器事件不冒泡误选；真实当前DOM，别调用私有handler。 |
| A9 | 嵌套identity与当前body | 同一path更新但所选命令身份改变/消失时处理选择；相同body副本、其它命令变化和本地已接受body不能被误当同一轴。只补独立未证部分。 |
| A10 | 终止与资源清理 | 新测试RAF/DOM/root/global与spy恢复；菜单/编辑关闭路径不制造提交。新增或实质新oracle最小有效变异，已有合同不重复建针。 |

## 独占白名单

仅可新增：
- `packages/editor/src/ui/ScriptEditor.interaction-boundaries.test.tsx`。
- `packages/editor/src/core/author-command-edit.interaction-boundaries.test.ts`。
- `packages/editor/src/ui/__tests__/script-interaction-boundaries/`。
- `docs/ops/evidence/TEST-EDITOR-SCRIPT-INTERACTION-1/`：README、逐合同ledger、fresh JSON/raw、反控runner/原件/receipt；以共同协议命名。
- 本卡“GLM贡献者回执”小节（只写自己的记录，不改顶部Status和Codex准入）。

全部产品、所有旧测试、共享fixture、配置/依赖/官方基准、真实数据、共享导航/看板/协议/targets及其它卡只读。白名单目标已有或其它Owner占用，停止该文件并通知Codex，不覆盖。可写新测不是保证每文件必须产生新用例；真实无缺口不建空文件。

## 冻结源

| 产品/调用源 | SHA256 |
|---|---|
| packages/editor/src/ui/ScriptEditor.tsx | 880e1af383d3ee45c02b66d7b51bc62ff3fa65f12f9606697f399d6d1b8cf441 |
| packages/editor/src/core/author-command-edit.ts | 58827d36cc7530478da0752d6bf73ec4a32ffe08db98bd79c68b8242660da63b |
| packages/editor/src/ui/SharedScriptTab.tsx | 0cf43c2b0d98971cf12d9c504ad475985b07e6658bb4b43fabae50c687ec2aad |

冻结变化只停受影响轴举证；不改产品、不rebase漂移、不用新接口或fallback解锁死分支。

## 验证与停止条件

定向（仅给已创建文件；零新增文件不强行跑不存在的名字）：

```bash
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run src/ui/ScriptEditor.interaction-boundaries.test.tsx src/core/author-command-edit.interaction-boundaries.test.ts src/ui/ScriptEditor.test.tsx src/core/author-command-edit.test.ts src/core/author-command-edit.boundaries.test.ts src/ui/SharedScriptTab.test.tsx
```

新增UI定向需零act/console.error/未处理异常；相邻旧日志如有原始诊断分列。每批定向+typecheck，最终一次本包test/typecheck、根lint完整0/0/0、docs/diff；不每针重复全仓门。贡献者不跑官方ratchet，覆盖只由Codex最终main并集结算。

反控/隔离/排重、执行身份多重集合与证据原件按共同协议；不用标题Set冒充运行次数。若白名单共享导航缺登记导致docs问题，只交精确诊断由Codex维护，不越界。

## 当前模式推进记录

- 2026-10-08 Codex：当前源、公开caller、代表旧断言及残余条件已直接读取；上述最强替代解释与停止线成立。build allowed仅新测试白名单。
- Coding Owner：GLM新对话A；三卡新测试/fixture/证据互斥，避开活动Game turn、E2E及质量治理产品Owner。
- 2026-10-11 Codex：贡献者候选已接收；独立验收 accept；done 准入按最终集成质量门收口。
- 有限清单闭合后交付review即停，Codex自行接受/返工、必要串行check→官方ratchet→受保护fast、合并推送与退休树清理。

## GLM贡献者回执

- 2026-10-08 GLM新对话A 交付（review，不合 main 不 done）：新增测试文件恰一个 `packages/editor/src/ui/ScriptEditor.interaction-boundaries.test.tsx`（7 原子合同 + 文件内 harness，sha256 `83b1f8d1a08fcf67361203ca0b20deb31f0db96e898690664d579939734a7c8f`）。白名单另两项真实无缺口未建：`author-command-edit.interaction-boundaries.test.ts`（helper 全量合同旧测已持，A1 登记）；`__tests__/script-interaction-boundaries/` 曾放 harness.tsx，因 design-system adoption 门按非 test 的 .tsx 计数使旧门 pin 101→102 漂移，折叠进 .test.tsx 并删除（未改任何旧测/共享门）。
- 裁决终态：A2/A4(×2)/A5/A6/A7/A8 七条 new-contract；A1/A3/A9/A10 existing-proof/registration，逐轴锚点、旧 fullName、oracle 与针位见 `docs/ops/evidence/TEST-EDITOR-SCRIPT-INTERACTION-1/contract-ledger.json`。A3 依赖 script-draft G04-04；A9 四臂各有旧证、消失分支（ScriptEditor.tsx:3510）无独立可判别 oracle。
- 反控：7/7 针四相位 accepted（判据库只读复用 + judgeSelfTest 20 例 + 真实 Vitest 探针 3 例；每针独立 mkdtemp 树、冻结源逐文件校验、恢复字节==冻结字节、finally 整树删除留证）。判例两枚：A7 首选针（包装层 if(changed) reorderKeys.move）无效——useDsReorderKeys 每渲染按对象身份调和自愈，换"拒绝路径仍重映射选择"针；隔离树需树内 wrapper vite.config 追加 fs.allow。
- 门：定向+相邻 60/60、扩展相邻 44/44、本包 typecheck 双段零错、全包 4913/4913、根 lint 0/0/0、check:docs PASS。共享登记缺口如实上报：stage 全部新增文件后 `code-quality-ledger.mjs` FAIL（inventory 3,086 vs 台账 3,085，恰为本卡 1 个新 tracked test 文件），精确修复建议在 gates.json，按共同协议留 Codex 集成。
- 提交：testCandidate `21ea2436102d1c210cf26685633849dc07c6a1ee`（代码+证据）；其后 docs-only 回执提交（receipt.json + 本小节）区间 `testCandidate..` 该提交，见 `docs/ops/evidence/TEST-EDITOR-SCRIPT-INTERACTION-1/receipt.json`。以待 Codex 独立验收。

## 历史派发提示词（2026-10-08，已退休）

```text
你是 TEST-EDITOR-SCRIPT-INTERACTION-1 的唯一Coding Owner，GLM新对话A。只在 /private/tmp/type-pal-editor-script-interaction.fgkhat/type-pal、分支 codex/glm-editor-script-interaction-r1 工作，禁止写main。先读AGENTS.md、docs/phase2/READ-FIRST.md、docs/ops/tasks/TEST-EDITOR-SCRIPT-INTERACTION-1.md及docs/ops/evidence/TEST-CONTRACT-BATCH-20261008/README.md和targets.json；冻结 797a46a097640206a12b8f61dc014c8db277e457 不rebase，按卡面A1–A10有限清单核当前源码/caller/合法typed输入/旧fullName与实际断言/oracle，已有合同只登记，优先A2/A3/A4及拒绝提交的实际选择/草稿变化；已有焦点成功、复制成功、重排undo与插入菜单缺角色合同不重写。 仅原卡精确新测试/专属fixture/证据可写，产品/所有旧测/配置/官方baseline/共享文档/真实数据只读。禁止强转、私有state、核心mock、skip/ignore/扩timeout；只控外部IO，DOM/React act及全局清理真实闭环。每条新增合同原子且有最小有效反控，保留同进程native JSON/raw、执行身份多重集合、exit/signal/spawn、恰一业务AssertionError、真正恢复绿、最终源/测试/mutant/restored hash及mkdtemp清理。逐轴existing-proof/new-contract/unreachable/blocked/product-counter裁决，全部有锚即停，不追例数/针数/覆盖率。跑定向相邻与本包全包/typecheck、lint完整0/0/0、docs/diff；基点红如实对照，不越界修。共享导航缺口由Codex集成登记，不为docs过门改白名单外。完整真实testCandidate/receiptHead和docs-only区间提交推送，只维护自己的贡献者回执，不改Status、不合main、不done，待Codex独立验收。
```

## Codex 独立验收与收口

2026-10-11，用户授权先验收合入三个 GLM，再清理退休分支。集成基点 `89133ca0fe5d7db6c9dcd54dd9bbcf17b9b09f1e`；贡献者旧回执、冻结与历史计数保持原件身份。

脚本接收 A2、A4 两臂、A5/A6/A7/A8 七个合同与七针。A6 移除 DsDialog 遮挡时点击底层删除按钮的不可操作路径；实际行操作拒绝、保留正文/选择和重试由公开 DOM 证明。实际当前 ScriptEditor 漂移仅为既已合入的 faceEntityToParty 展示/表单/插入，交互条件重新读取并按当前 SHA 重放。

最终候选的业务条件、真实 caller、合法输入、旧实际断言、反证与差异裁决见[独立验收](../../../evidence/TEST-CONTRACT-BATCH-20261008/codex-review.md)；当前原件和每包严格相位判据见[验收汇总](../../../evidence/TEST-CONTRACT-BATCH-20261008/codex-originals/acceptance.json)。最终本地门见[集成门回执](../../../evidence/TEST-CONTRACT-BATCH-20261008/codex-integration-gates.json)。产品、所有旧测试、依赖和门配置未改动；官方 fast 基准仅按最终实测只升不降。

无下一位 Agent 提示词，Codex 负责本次合并推送、核新 HEAD 托管 CI 后退休分支和工作树；历史 E2E 证据与十三份未提交 JSON 保留，不重跑。
