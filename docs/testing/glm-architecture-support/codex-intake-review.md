# Codex 独立接收：ARCH-SUPPORT-GLM-1 / 3967a376

2026-09-25；候选 `3967a376`，起点 `32704738`，生产冻结 `b11d4bc9`。
结论：**整包 counter；P1～P6、V1～V2 分别 counter（下表逐包理由），保持 draft，不开 build、不标 done。**
这是对取证质量的裁决，不是发现了八个产品缺陷。GLM是材料贡献者，不算自己交付的独立第三方。
原报告/机账原样保留；本报告及[独立机账](codex-intake-evidence.json)为Codex席位，不冒写GLM结论。

## 接受并冻结的有效证据

- `git diff 32704738..3967a376 --name-only`恰**12文件**，全部位于指定目录；
  `b11d4bc9..32704738`与`32704738..3967a376`的packages/scripts均零diff。
- 11张PNG实物全部存在；本席逐张目视检查，登记哈希前缀均匹配，PNG IHDR尺寸与登记的1440×1024/768×1024一致。
  完整SHA256落本席机账；不把像素尺寸当作浏览器zoom/DPR实测。
- V0实际页面/tab切换截图、V1模拟器方案/我方预设/多选布局、V2新建弹窗/引用页/地图面板/脚本空态图可作为
  **对应有限观察**接收。不是完整模块、滚动/键盘/缩放或资源画布验收。
- GLM没有把不确定折叠行为冒称产品缺陷，这一保留是正确的。`reproduced=0`只保留为其原交付分类，
  不证明其它条目的事实前提、覆盖归因或建议正确。

## R0：全包账本与可追溯性（必须一并更正）

1. `summary.md:30`及`evidence.json:61–65`称32条，实际是**38个唯一ID**：covered12/risk18/blocked2/reproduced0/N/A6。
   不是人工挑出32条再对总数；须从最终entries重生成各包及全包小计。`summary.md:11`的9文件实际为12文件。
2. 工作包要求的逐条冻结/源码hash、操作或命令、实际结果、预期来源、受影响域、完整测试file/title/断言锚点、
   建议归属未闭合。当前不少anchor是“某文档§表”或省略号，“精确标题”实际只有示例/范围；
   可以共享sourceHash表并用键引用，不需要重复手填hash。补明确的**静态事实 / 已读测试断言 / 本次执行**口径，
   不以grep计数或有同名测试就写“全部覆盖/全绿”。准备包不要求重跑全仓。
3. `evidence.json.finalSha`仍是占位词；README也没有承诺的最终SHA回填。以提交树可定位的候选SHA登记。
   浏览器版本、实际zoom/DPR缺席，不补猜测；允许如实未记录并收窄视觉结论。
4. 候选`evidence.json`的Biome检查exit1（formatter），日志`/tmp/codex-arch-support-biome.log`；
   不改工具规则，只格式化本人交付JSON。Codex未替GLM格式化或改写原机账。
5. 原README用代码文本列文件，没有真实索引链接；加入本席报告后首次check:docs为11漏链，其中10条为原交付。
   Codex只追加机械链接索引（包括本人报告）解决可发现性，不修改原README文字/GLM报告语义；不要求GLM重做这项。

## 分包裁决与直接反证

| 包 | 本席裁决 | 阻断与直接证据 | 返工边界 |
|---|---|---|---|
| P1 | counter | `p1-app.md:25/:72–77`把derivedStore写成props传入且没有stop；实际`App.tsx:422–426`在useMemo创建，effect直接返回`start()`结果；`core/editor-derived-store.ts:396–415`返回stop，退订两会话并terminate worker。`p1-app.md:41–42`又把导航测试误当helper，实际有17项it测试 | 撤回P1-001前提，补owner→factory→返回清理的真实链；完整盘点state/ref/effect，不能只列少数资源后称逐项完成。没有实际错配路径，不把`assertSessions`移到effect作为已论证修复 |
| P2 | counter | `p2-mapmode.md:17–20/:77–84`声称缺pointerCancel/lostcapture且blur只清hover；冻结`MapMode.tsx:3075–3079`两入口均存在，`:2292–2305`清selection/painting/stroke/pan，`:2307–2310`blur调用同一cancel。`MapMode.test.tsx`Vitest实际收集72项，不是58项 | 撤回P2-002“缺实现”，可单列取消回归是否充分待证；测试定义数和参数展开用例数分开。双effect/加载失败等建议须核消费者，不把相邻catch当整页无错误反馈证明 |
| P3 | counter | `p3-script-forms.md:47`把旧CommandForm的50个switch case与canonical命名门混为一谈；`ScriptEditor.test.tsx:71–81`比较RUNTIME_COMMAND_KINDS与AUTHOR_COMMAND_PRESENTATION_，后者在`ScriptEditor.tsx:536`有81键。`:66`所谓WorldVariablePicker两effect也不实：其`:171–201`为纯计算；CommandForm唯一useEffect在JsonForm`:219–222` | 分开旧适配表单/canonical作者命令族，补工作包点名的default/hook/session/undo对账，尤其`core/script-editor.hooks-session.test.ts:57/:95/:146`三轴。42项UI测试计数本身正确但不能替代这些会话合同；JSON.stringify风险保留，真正逐render锚在`:3149`，不是只凭`:3174`effect |
| P4 | counter | `p4-battle-session.md:25`写“writeBackHp:604 preparing早退”；`:604`实际是beginTurnPreparation，writeBackHp在`:2534–2540`无此门。`:54`87测试混合grep计数；实际43+46+4=93。`:65–66`因不读main而跳过BattleSession自身pump/render耦合，回避了本包目标 | 更正门归属，区分开战视觉ready输入与逐回合SFX屏障，补本类`:1032`pump到`:2543`render的读写/资源收口边界；不需要读取或修改main/A3，更不能据错锚新增writeBackHp防护 |
| P5 | counter | `p5-phase1-core.md:24–31/:79–81`的“6文件两环、battle/equip不在环”不成立。冻结`battle-opcodes.ts:25`回指event-system，`equip-effect.ts:19`回指event-system；event-system`:53/:57`分别回指二者；还漏`scene-system.ts:12`回指event。静态runtime SCC仍是原**7文件同一强连通分量**，内部15条边 | 重建type-only/runtime图与真实caller，再评切边后剩余环，不先宣布“最短无行为切法”。7个测试文件收集702项，不是703；本席仅收集，没声称本轮全跑一阶段 |
| P6 | counter | `p6-conversion-validation.md:31–41`漏onFlee/onFail/onNo和author→enemy方向：author-script-core`:710/:722/:726`递归；`:3/:712`调checkBattleChoreography，enemy-script`:6/:598`又调checkBaseAuthorCommands。不是已证单向“author底层、enemy上层”。mapScenesStatic`:2126–2135`为6参数，非5 | 真实双向校验及错误路径/调用域补齐，再谈共享协议。保留已核四个转换/校验模块无fs和transaction两个writeFileSync事实，但不能据此推出整个迁移管线只有这两个写入点或纯函数绝不改输入 |
| V1 | counter | `v1-forms.md:32–34`无可访问名结论被源码和浏览器同时反证：`design-system/multi-select.tsx:119–121`有`aria-label=搜索+label`，6010实际AX显示“搜索指定技能”，输入“气疗”只余气疗术，Esc回触发器。`:29–31`把离散多选和替换整份临时草稿当同一取消合同 | 撤回a11y缺名与重开产品裁决建议。DS-C.5a允许checkbox/select即时提交、DS-C.6规定Esc关选择层；无placeholder可作为独立可发现性建议，不等于缺accessible name。Actor/物品/敌队/战场/TrialDialog未做仍需补或明确未完成，不把时间分配当工具blocked |
| V2 | counter（收窄） | `v2-workspaces.md:28–29`用`MapMode.test.tsx:568`Inspector Tab键盘用例证明separator可达性，合同对象不同；该用例`:569–572`只调verifyInspectorTabs。对象列表真实6010往返已由Codex补验正常 | 改正测试归因，折叠标为原GLM未确认/本席已证正常。保留真实截图与未判画布范围；补工作包要求的分隔条/缩放/非空脚本工作区证据，或按未完成列出，不用空态图冒充ScriptEditor编辑合同 |

以上反证均在同一冻结产品树成立；main86e928b5与候选的editor/content生产源码零diff，
所以本次6010复核没有拿另一个已修过的编辑器来反驳旧候选。

## 只读复算与本次执行

[复算器](codex-intake-probe.mjs)只读取Git冻结树和已存在截图：

```bash
cd /Users/zhangxu/illegal/type-pal-glm-architecture
node docs/testing/glm-architecture-support/codex-intake-probe.mjs
```

exit0只表示白名单/冻结/截图校验成功且普查完成，**不表示38条结论被接受**。输出含完整SHA、38条复算、
runtime/type-only分离及7节点/15边SCC；不写产品、不跑原版机制模拟、不跑迁移写盘。

本席从候选物理工作树执行（依赖realpath也落本worktree），Node22.23.2/pnpm10.29.2：

- `pnpm --filter @type-pal/editor exec vitest run src/core/editor-derived-store.test.ts src/ui/editor-navigation.test.ts
  --reporter=json --outputFile=/tmp/codex-arch-support-targeted.json`：**39/39通过**（22+17），
  包含`editor derived worker store stop cancels a queued refresh and ignores late worker events`。
- Vitest list只收集未执行：MapMode72；ScriptEditor24/CommandForm characterization13/SceneScriptWorkspace5；
  battle-session43+六flows46+hook4=93；一阶段七文件702。完整命令和输出见独立机账。
- 浏览器：6010当时未运行，由Codex在main启动现有dev脚本，独立IAB新标签1440×1024。
  对象列表按原生AX点击：checked1→0、左分栏194→0、目录消失；再点恢复1/194。
  Playwright DOM核对该控件仍是button（count1），AX呈checkbox不代表DOMrole变更，
  **不把GLM的actionability超时武断归因于role错误**；旧(1064,18)点击没有命中见证。
- 模拟器我方预设：实际搜索名与过滤如上，未勾选/保存任何配置；结束保存禁用、已保存，导航与面板恢复初态。
  运行error/warn空，viewport复位、临时标签关闭，自建6010已停止，GLM6013未操作。截图为本席会话内联，未伪造落盘路径。
- 没有统计并集、全仓check/ratchet/strict、E2E或产品修改；main保持干净。
- 本席新增probe/机账Biome exit0；补机械索引后check:docs exit0（工具测试20/20、0issues），
  日志`/tmp/codex-arch-support-docs-final.log`；原GLM机账的formatter错误仍由GLM返工，不混称整包Biome通过。

视觉初审使用Web Interface Guidelines的表单名称/焦点核验方向；实际裁决依据项目DS-C.4/DS-C.5a/DS-C.6
与上述现行控件/实际AX，不把外部建议变成新产品要求。

## 下一位 Agent 提示词（GLM）

```text
在 /Users/zhangxu/illegal/type-pal-glm-architecture、codex/glm-architecture-support-r1
返工 ARCH-SUPPORT-GLM-1。先同步分支，读AGENTS/CLAUDE/READ-FIRST、draft任务卡、
docs/testing/glm-architecture-support/codex-intake-review.md 与 codex-intake-evidence.json。
本轮对3967a376八包分别counter，生产冻结b11d4bc9不变，build未开放。
按R0及八包表逐条更正：38条真实账/来源与完整标题；derivedStore返回清理、MapMode现有cancel门；
50 runtime与81 canonical区分、default/hook/session三轴；BattleSession真实门归属及pump/render边界；
七节点15边runtime SCC；author↔enemy真实校验递归；技能搜索已有accessible name和即时多选合同；
separator不能借Inspector Tab测试。Codex已证对象列表可正常折叠，不重复追不存在的缺陷。
有效冻结/截图哈希与有限布局观察不重做，未完成视觉项目补足或逐项说明真实阻塞，不把时间不足当能力阻塞。
只改原白名单内自己的报告/机账/必要只读probe；保留Codex反证文件与席位，不改产品、正式测试、配置、
基线、共享状态，不跑全仓/覆盖率/迁移写盘，不标done、不代签。复算小计/精确标题/完整hash并跑本人文件Biome，
整包交回Codex；Kimi本队列豁免，无Kimi提示词。
```
