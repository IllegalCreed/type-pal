# TEST-GROK-BOOT-RESOURCES-MEDIUM-1 — 启动资源并发、降级与缓存边界中包

Status: build
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
- 贡献者交付/自验：pending。
- Codex独立accept/done：pending/blocked；作者不得合main或标done。
- 用户产品裁决：N/A（不改变产品或格式；需要新取舍时另卡）。

## 风险与停线

源/冻结/Owner冲突仅停止受影响子组；禁止擅rebase产品版本来消除漂移。旧卡的counter不因新卡消失。
同时有旧Owner树运行时，不把新卡写到旧树、不merge旧包；同卡第二写入会话先停派、不能抢锁。
Schema/save/输入合法性必须按当前公开入口证明；故事/现实数据用例本卡不覆盖，缺真实资产不准填假绿。

## 交接日志

- 2026-10-02 Codex：用户重新授权三中包，核定冻结、候选旧证明、独占范围和容量；已开卡待用户转发，不声称已执行。Next: Grok build → Codex independent review。

## 下一位Agent提示词

```text
接手 TEST-GROK-BOOT-RESOURCES-MEDIUM-1，唯一测试Owner Grok，Status build（Codex仅准入新测试）。任务卡：docs/ops/tasks/TEST-GROK-BOOT-RESOURCES-MEDIUM-1.md。先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md（本卡phase2时）及docs/testing/medium-triple-20261002/README.md、targets.json、本卡全部锚点。原范围已核，源码冻结554b8a0552db30294a9050b4466659c4a14549f8；从本批docs登记提交创建自己的分支codex/grok-boot-medium-r1和隔离树/Users/zhangxu/.codex/worktrees/grok-boot-medium/type-pal，不要切原工作树或带回旧产品版本。先核BASE、branch、status、verify --owner grok，再按本卡候选6组读旧完整fullName/全部matcher，逐条existing-proof/合法新gap/unreachable/blocked账；目标24–32例，硬上限36例是容量预算不是凑数门，真实缺口不足如实登记给Codex，不擅扩域。仅targets白名单新测/专属fixture/grok证据可写，产品/旧测/依赖配置/baseline/真实数据/共享文档/其它Owner全只读。原400卡review且窄项accept，不把未集成叫done；新卡不改/重跑其40针或PNG证据。原候选400为必须排重基线，当前源hash若不等则逐条件对照，不把旧版本报告当新门。使用真实公开函数及完整typed/current输入，不unsafe桥/ignore/扩timeout/业务核心mock；产品缺陷只停受影响子组举证，不夹修。每批定向相邻/typecheck；最终4个不同新oracle目标的隔离产品变异三态JSON/raw/exit/完整身份/恰一AssertionError/恢复绿/源与测试hash，至少两枚做旧绿新红感度；不足不造针。运行所属包全测/typecheck、根lint完整0/0/0、docs/diff/verifier，raw门原样保留；环境红分列，不复跑官方全仓check/ratchet/protected或真实E2E。合同账逐条源条件/实际caller/合法输入/旧blob fullName-matcher/完整业务oracle，数量与净新分列；一次交付完整SHA、directed JSON、判据/三态与未完账并推送独立分支，等Codex验收。不合main、不done、不清原树；未用户转发前不声称已派发执行。
```
