# TEST-GROK-BOOT-RESOURCES-MEDIUM-1 — 启动资源并发、降级与缓存边界中包

Status: rework
Phase: phase1
Capability: test-coverage / grok-medium
Coding Owner: Grok（仅白名单新增测试、fixture、专属证据）
Generation Owner: N/A
Reviewer: Codex（独立验收/正式结算）
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Branch: `codex/grok-boot-medium-r1`

## 目标与容量

用户2026-10-02授权Grok/Kimi/Cursor各一批**中等体量**。本卡候选6组，预计24–32例，硬上限36例，4个不同合法新oracle反控目标。
数字为预算，不是强迫造用例的门槛；所有候选条件逐条处置，先旧证明排重，再补真实新缺口。
不足须交精确existing-proof/unreachable/blocked及剩余量给Codex裁决，不自动整族免做或换数值凑数。
达到硬上限停止追加；Grok/Kimi按此前剩余约1/3额度控制，不滚动续派大包；不把原700卡缩成此中包。

[共同协议与路由](../../testing/medium-triple-20261002/README.md)、[冻结与独占白名单](../../testing/medium-triple-20261002/targets.json)。
源冻结为当前main `554b8a0552db30294a9050b4466659c4a14549f8`（content21/SAVE10）；开工BASE为随后仅新增此批文档的登记提交，不能在旧冻结源码树直接开本批。
隔离树：`/Users/zhangxu/.codex/worktrees/grok-boot-medium/type-pal`。由Codex预备或贡献者创建；若路径已存在先核对BASE/分支/干净状态，不重建或覆盖。仅此分支此Owner写入。

## 范围与排重

主合同源码（只读）：

- `packages/game/src/shell/bootstrap-resources.ts`
- `packages/game/src/assets/dialog-assets.ts`
- `packages/game/src/assets/loader.ts`

只可新增targets.json精确注册的测试与本Owner fixture/证据目录；本任务卡/共享README/targets/verify工具由Codex维护，贡献者只读。
原400卡review且窄项accept，不把未集成叫done；新卡不改/重跑其40针或PNG证据。原候选400为必须排重基线，当前源hash若不等则逐条件对照，不把旧版本报告当新门。
现main全部旧测试与targets.dedupCandidates固定候选都要按合同对照，旧fullName不等于全部旧oracle；更名/不同数字/weak matcher不能算新。
业务输入必须经过现行公开typed/作者载入入口；坏JSON只在unknown/IO验证域输入，不伪造typed业务对象。

## 前提真值门

一句话：既有启动资源加载有两个独立barrier，单项图像/文字降级不应替代真正资源ready；本卡只检验已实现合同，不更改时序或失败策略。

| 维度 | 已核前提 | 直接证据 |
|---|---|---|
| 原版/primary | N/A（不裁决原版启动体验、玩法或像素坐标；当前一阶段TS公开宿主合同是本卡主证） | 下表当前公开源码与实际caller是测试前提的一手证据 |
| 第一阶段 | TS启动宿主合同，保持资源失败/缓存策略，不推断PAL原版机制 | bootstrap.ts:238/630及既有bootstrap-resources.test.ts |
| 当前二阶段 | N/A：本批仅game，不进入Reforge | 本卡三源只在packages/game |
| 本卡目标 | 只追加冻结现行合同的判别性测试，before→after产品行为不变 | sourceBase Git对象+targets SHA256+diff白名单 |

最强替代解释：某“缺口”已由main或未集成候选的更强断言证明，或只能伪造typed输入才可触发。
可证伪观察：相同最小产品变异旧新同红则优先排重；公开输入校验拒收正控则不得声称合法新例。
runtime/命令真值、原版理解、数据解码或测试模型四类根因分开登记；没有产品修复层裁决授权。
无用户可见偏离，无schema/save/格式/管线写入。发现新产品取舍/未知机制，仅停受影响子组并举证，其他合法组可继续。

## 候选合同与一手锚点

| 组 | 领域 | 冻结源码/caller锚点 | 具体残余候选与旧证明限制 |
|---|---|---|---|
| G1 | 启动双barrier正交 | `bootstrap-resources.ts:43-63；bootstrap.ts:238` | assets/dialog拒绝时原错误身份与soundfont settle仍独立；先settle音色而其余未ready的反向顺序，不重复旧启动顺序/单glyph失败。 |
| G2 | 完整装配边界 | `bootstrap-resources.ts:49-63` | deferred合法typed四端口，resourcesReady未齐前不能早兑现；多种顺序只为区分不同barrier，不穷举排列凑例。 |
| G3 | 默认端口真正IO | `bootstrap-resources.ts:27-37` | 使用真实Response/ArrayBuffer与真实资源解码管线，公共loadAll不得业务mock；若完整默认端口不经济，只停这子轴，不扩大源码。 |
| G4 | 头像与图标并行降级 | `dialog-assets.ts:48-137` | 核原400中dialog-icons和load-all已有合同；合法合成PNG/RLE，某头像失败不抹其它成功头像/图标，结果Map和warn精确，不重复全部空Map旧例。 |
| G5 | 缓存淘汰可观察回调 | `loader.ts:453-501；bootstrap.ts:630` | public loadScene触发onEvict的删除先后/保护切换合法输入；读旧LRU和原400并发/保护十例，旧证分列，不窥private cache。 |
| G6 | 重入、失败与隔离 | `以上公开入口` | 独立boot两轮promise不串场、缓存fail后业务状态残余；拒绝已有旧400相同合同，记录actual caller与输入合法性。 |

这些是已核代码条件的候选池，不宣称全部都未覆盖；贡献者必须先逐条件阅读全文排重。
旧测试必读：

- `packages/game/src/shell/bootstrap-resources.test.ts`
- `packages/game/src/assets/loader.test.ts`
- `packages/game/src/assets/png.test.ts`
- `packages/game/src/assets/tileset-blob.test.ts`

还须读同域新旧所有测试及固定未集成候选，不能只看以上短清单。当前产品体验review/E2E卡状态不被本测试卡覆盖。

## 验收与交付

1. `contracts.json`每条源条件/实际生产caller或有证N/A/合法输入/旧Git blob+完整fullName+全部matcher行/新observable oracle完整expected/分类；新、旧证明、不可构造、阻塞分列。
2. `directed-vitest.json`真实file×fullName×status，零skip/todo/空执行；每批定向+相邻，结束所属包全测/typecheck。Kimi为Reforge+content两包串行，另两卡各game/Editor。
3. 4枚主反控仅在自有mkdtemp隔离副本最小产品源变异，恢复后真实重跑；正/变/恢复JSON与raw/exit/执行集/目标/产品和测试三態SHA完整，唯一judge由runner/selftest共用。至少2枚新旧同场旧绿仅新红。合法输入分区只可辅助，不能冒作产品变异主针；数量不足如实counter。
4. 禁止双桥/as never/ignore/扩timeout/业务核心mock/私有态/手画图伪业务；允许typed IO port/deferred、标准HTTP、真实Canvas（如需要），清理仅本次临时目录。
5. 根lint完整error/warning/info=0、docs零、`git diff --check BASE...HEAD`零、共享只读verify通过；最终回执/SHA编辑后再次lint/diff。完整门有环境资产红要保留原报告、精准说明；不能作者自报accept替代Codex。
6. 不跑浏览器剧情、PAL001/002/004、现有6012或新产品E2E，不生图、不要求人工产品体验；本批没有视觉验收承诺。
7. 覆盖如实报私有增量/口径，建议仅最后一次同分母隔离测量；非必要不耗费额度重复全仓覆盖，85%只由Codexmain并集实测。不得写官方基线/official ratchet/protected脚本。
8. 交付一次完整40位候选SHA、测试/证据提交与docs-only尾区间、准确执行/净新/反控/未完账，推送本卡独立分支；原主工程和其它Owner零写入。

## 当前模式推进记录

- 2026-10-02 Codex premise verified：直接读取上表源码与相邻旧正文，sourceBase真实对象；新Kimi/Cursor四源均不在旧O/P/Q或Grok/Cursor冻结池，Grok三源维持Grok原Owner。
- Codex design agree：中量封顶、精确写入白名单、各自隔离、新旧oracle排重、当前版本冻结；产品风险仅可记录不能修。
- **Codex build allowed：仅新增测试/fixture/本卡Owner证据**。无固定三签等待；本卡三Owner互不写同文件，依赖可只读。
- 贡献者交付/自验：固定候选 `8ab4752727699a821492e26c2bb3111171234f5d`，已推送，作者树干净；不是Codex接受。
- Codex独立accept/done：2026-10-02 counter / rework。GROK-R1-01：C3图标键oracle旧候选已证，补第四不同新目标；其余三针复算闭合，19例软预算不强补。
- 用户产品裁决：N/A（不改变产品或格式；需要新取舍时另卡）。

## 风险与停线

源/冻结/Owner冲突仅停止受影响子组；禁止擅rebase产品版本来消除漂移。旧卡的counter不因新卡消失。
同时有旧Owner树运行时，不把新卡写到旧树、不merge旧包；同卡第二写入会话先停派、不能抢锁。
Schema/save/输入合法性必须按当前公开入口证明；故事/现实数据用例本卡不覆盖，缺真实资产不准填假绿。

## 交接日志

- 2026-10-02 Codex：用户重新授权三中包，核定冻结、候选旧证明、独占范围和容量；已开卡待用户转发，不声称已执行。Next: Grok build → Codex independent review。

## Codex 独立审核 r1（2026-10-02）

固定候选：`8ab4752727699a821492e26c2bb3111171234f5d`。独立证据与全部一次窄项见[三中包审核](../../testing/medium-triple-20261002/codex-medium-r1-review-20261002.md)。

GROK-R1-01：C3图标键oracle旧候选已证，补第四不同新目标；其余三针复算闭合，19例软预算不强补。

冻结12/12及白名单、定向相邻/typecheck、根lint完整0/0/0、diff通过；作者docs仅剩共享导航归Codex。全包本轮结果与首次失败原报告分列在审核文档，不把作者“完成”当accept。
本轮无产品/旧测/配置/baseline写入，无main/official coverage/done。原中量预算不升格为新大包，旧400/700卡独立保持。

- 交接日志：Codex固定候选独立counter已落卡，下一步为原Owner按下面提示词一次修齐，再固定新SHA二审；不重开未变闭合项。

## 下一位Agent提示词

```text
Grok 接手 TEST-GROK-BOOT-RESOURCES-MEDIUM-1 一次窄返工，原树 /Users/zhangxu/.codex/worktrees/grok-boot-medium/type-pal，原分支 codex/grok-boot-medium-r1，候选 8ab4752727699a821492e26c2bb3111171234f5d。只读审查材料位于 /Users/zhangxu/.codex/worktrees/medium-test-dispatch/type-pal，不merge审查分支到作者树。先读本卡最新 Codex 审核及 docs/testing/medium-triple-20261002/codex-medium-r1-review-20261002.md 的 GROK-R1-01。C3-icon-index 机械三态有效，但 frozen f4665f7a 的 dialog-icons.grok-r1.test.ts G02-D01/D04/D08/D13/D14 已证相同图标键 oracle，Codex 同变异复跑旧5红+新1红；降为 existing-proof/cross-check，历史证据保留，不计第四个新目标。仅在原三源合法剩余合同内选择一个真正不同且排重的新 oracle 替换主针，四针完整三态 JSON/raw/exit/非零身份集合/指定单红/恢复绿/产品和测试 SHA，至少两枚真实旧绿新红。保留 C1/C2/C4 已闭合方向与未变证据，测试/执行范围变动才重采受影响针；组合降级正例可保留，但旧图标键不冒作新目标。19例低于软预算不是返工原因，G3完整默认解码停子轴、9项其它处置不扩大成新大包，不凑到24。更新账和回执后定向相邻/game全测/typecheck、lint完整0/0/0、docs/diff/verify；共享导航由Codex接线。只写原白名单新测/fixture/grok证据，产品/旧测/配置/基线/其它卡/真实数据/共享卡只读。一次交完整真实40位SHA、测试与docs-only尾区间并推送，等Codex；不合main、不done、不跑官方覆盖或E2E。
```
