# TEST-GLM-WAVE-Q-1 — 两阶段runtime与解码残余合同十倍测试包

Status: rework
Phase: mixed（Reforge phase2；game/pal-extract phase1，严格分段）
Capability: runtime-residual / test-coverage
Coding Owner: GLM Q（仅新测试与专属证据）
Reviewer: Codex（独立验收、集成和正式结算）
Visual Verification Timing: dev-functional（仅非剧情菜单/有限trial）
Branch: `codex/glm-wave-q-runtime-residual-r1`（新独立worktree）

## 最新新增合同边界与模型（2026-10-01 GC-1）

[Grok保留game46源](../../testing/grok-cursor-large/targets.json)的后续新主合同/反控归Grok，
取代下文“game全包新增合同独占”；Q保留runtime/battle/event等其它源和原审核窄返工。
已有framebuffer测试与有效证据原样保留作为排重基线，不重领、不代改Grok树；
依赖可只读调用，原派发/冻结/700例/50组/50针/10流程及counter不变。
模型明确：代码/类型/反控/合同账用GLM-5.3；实际宿主截图读图阶段用GLM-5.3-Flash。
用户手动转发，不冒称已收到边界，不恢复ZCode操作。

## 目标、冻结与停线

目标 **700合法未重复用例、50合同工作组、50有效反控、10条实际非剧情功能流程**。
[共同协议](../../testing/glm-tenfold-triple/README.md)及
[冻结表](../../testing/glm-tenfold-triple/targets.json)为准：Reforge149+game136+pal-extract38=
323源/SHA256，6136未命中臂仅是池。冻结 `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`。
派发含N53例，以及F–K和旧runtime测试，逐fullName/断言去重，不重跑原卡交付。

不启动PAL001/002剧情、改checkpoint、save/NPC/移动碰撞语义或接管他人E2E窗口。
main.ts大量剧情分支必须记out-of-scope；不能给全局状态开后门/快捷跳关刷覆盖。
GLM对机制新真值无决策权；需要新增原版公式/opcode/碰撞解释时先交primary证据，
由Codex补四向真值矩阵后才开放该子组。其它已核公开生命周期/IO合同可连续实施。

## 前提真值门与上下文

工程前提：两阶段现行公开runtime/资产解码入口可在合法自包含输入上观察最终结果与释放；
测试证据增强不改变玩法、产品或资产格式。不能用第二阶段自由架构论替第一阶段改行为。

| 维度 | 锚点与边界 |
|---|---|
| primary | phase1遵循CLAUDE忠实纪律、对应reference/sdlpal/真实提取字节；未核机制是停线项，不能从源码推断原版 |
| 一阶段 | 既有game/mechanics与相邻测试是去重和证据索引，不把可能bug固化为原版行为；pal-extract解码用合法小字节/roundtrip |
| 二阶段 | `reforge/project-loader.ts:324`公开加载；`script-runner.ts:220`evalCondition；N已核公开Canvas/菜单/launch边界 |
| 目标 | 仅公开IO/生命周期/已证当前合同补测；新机制、剧情/移动真值、产品修复均未授权 |

最强替代解释：缺口是完整剧情路线、真实PAL资源、宿主限制、已证旧合同或产品缺陷。
推翻观察：没有合法调用方、靠unsafe cast/私有字段/timeout/mock核心才绿，停止该组并登记。
先读CLAUDE、phase2 READ-FIRST、game-mechanics/engineering-notes相关段、harvest相应领域，
两阶段分批记录primary/caller锚点；Q不新建一份彼此混用的“双引擎真值”。

## 十里程碑（每域五轴，共50工作组）

| 批 | 范围 |
|---|---|
| Q01 | Reforge非剧情boot/menu/gallery/trial公开残余，main剧情缺口明确排除、N排重 |
| Q02 | project loader/manifest/catalog/map/image/sprite缓存、哈希/缺失/过期/释放 |
| Q03 | bgm/midi/sfx/video浏览器IO与取消重试，真实外部边界而非mock调度核心 |
| Q04 | Reforge script-host/runner/event-lifecycle公开请求与最终提交；不走PAL路线或改语义 |
| Q05 | Reforge有限battle trial/session/assets/UI/animation资源归属和终结，不裁决新战斗数值 |
| Q06 | game输入/menu/status/inventory/save宿主边界，当前版本与相邻已核事实；不跑真实存档 |
| Q07 | game已证事件/opcode生命周期与错误/取消边界；新公式/移动真值停线待核 |
| Q08 | game战斗已证状态/回调/呈现/资源释放；原版机制争议交Codex，不冻bug |
| Q09 | game壳层/音频/视频/计时/隐私选择与dev工具纯输入边界；不接真实用户服务 |
| Q10 | pal-extract当前解码/recompile/slice/CLI小输入、确定性/故障/资源释放；整账门禁 |

每域五轴：正常有限流程；边界守卫；失败恢复；乱序/取消/资源归属；最终状态/重放不变。
非异步函数没有取消轴就记N/A，不假造能力。每批约70例/至少5有效反控，十批连续推进。
十条浏览器流程严格非剧情：菜单选中/取消、空档返回、合法小trial配置失败恢复/退出资源、
媒体autoplay/取消等公开功能；真实相位差分与前后截图hash/console，不能挂__rfWorld跳开局。

## 写入、验证与收口

仅Reforge/game/pal-extract `src/**/*.glm-q.test.ts(x)`、各自 `src/__tests__/glm-q/**`与
`docs/testing/glm-tenfold-triple/wave-Q/**`可写。复用公共fixture只读；O/P包/产品/旧测/
共享配置/依赖/官方baseline/原版资产/PAL工程/存档/E2E文档/任务卡只读。
所有CLI/extract只用mkdtemp小输入，不写根data/raw/extracted或运行主工程生成。

按共同协议交700最终fullName JSON、逐合同排重、50枚原变恢复完整反控/业务AssertionError/
执行数/三态hash/patch、十条实际非剧情浏览器证据、同源同分母私有覆盖、receipt/未证/缺陷。
三个Owner包末批串行test/typecheck、根lint完整0/0/0、docs、区间diff、verifier；
官方ratchet/protected fast与main集成仅Codex。若无真实2D/资产宿主，诚实blocked，
不能将测试宿主透明像素限制写成产品unreachable。

## 当前模式推进记录

- Codex：包目录独占、冻结库存与N纳入派发已核，**build allowed仅上述测试**。
- GLM Q唯一Owner；实现文件无人获准修改；阶段真值/产品取舍未定的组不在build授权内。
- 贡献者交付/独立验收pending；done blocked，700不足交可复核排重/可达性账申请调整。
- 纯测试用户产品验收N/A；视觉由Codex复核；不恢复固定三签。

## 下一位GLM Q提示词

```text
你是 TEST-GLM-WAVE-Q-1 唯一测试Owner。从本轮派发40位SHA新建 codex/glm-wave-q-runtime-residual-r1 与独立worktree。
先读AGENTS、CLAUDE、READ-FIRST、本卡、相关mechanics/engineering/harvest、GLM自检、glm-tenfold-triple协议/targets和N及旧断言，跑verifier。
连续十批Q01–Q10：700合法未重复合同/50组/50有效反控/10条真实非剧情菜单或有限trial功能流程。
Reforge与game/pal-extract阶段分开；新原版机制/移动碰撞真值先停线交primary证据，不固化产品bug或启动PAL001/002。
仅本卡Q新测试/专属fixture/证据可写，交最终fullName JSON、排重账、原变恢复日志/hash/patch、浏览器相位/截图/console和私有同分母覆盖。
三个Owner包串行全包test/typecheck、根lint0/0/0、docs/diff/verifier后推送完整候选SHA；产品/旧测/配置/baseline/O/P/真实工程/E2E只读，不合main、不标done。
```

## Codex 独立审核返工项（2026-10-01）

候选 `626ddffe41cca4e3755dfafea1645c695c158b0f`，远端与本地相符。
Codex **counter → rework**；113/700例、34/50枚反控，Q07/Q08/Q10未开展，其它批未达到整包目标。
[独立审查与返工项](../../testing/glm-tenfold-triple/codex-review-20261001.md)、
[457例实跑及门禁机器证据](../../testing/glm-tenfold-triple/codex-review-20261001.json)
覆盖上方旧派发提示词，不追溯改历史。

- 冻结716/716及白名单通过；98+15例全绿、三个Owner包typecheck、lint2802文件0/0/0、docs/diff零。
- Q-01：audio-spessa-runtime新测:162/239的unknown双桥需删除，用typed外部port/probe。
- Q-02：directed JSON为list枚举，无status；34处嵌套名分隔差异不是缺例，需最终实跑JSON。
- Q-03：34枚缺恢复后执行与三态完整JSON/raw，hash重建通过不等于有效反控accept。
- Q-04：实际15新测试+1fixture，回执/README数量不一致；11截图hash相符，但F1恢复表述与autoplayOverlayClicked=false矛盾，视觉尚未accept。
- COMMON-01：原700例/50组/50有效反控/10实际流程保留；函数名搜索不替代逐合同existing-proof。CLI模块相对根本身不证明不能mkdtemp复制树隔离。
- 疑似enterLoad缺陷只登记待核，不授权改产品；全包/正式覆盖/统一门本轮未复跑，不合main、不done。

### 下一位 GLM Q 提示词（返工，取代旧派发提示词）

```text
你继续 TEST-GLM-WAVE-Q-1，原分支 codex/glm-wave-q-runtime-residual-r1，起点候选 626ddffe41cca4e3755dfafea1645c695c158b0f。当前 rework，只写原Q新测试/专属fixture/wave-Q证据。
先读 /Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-Q-1-runtime-residual-tenfold.md 的2026-10-01返工段与所链审查/机器证据，再读共同协议、GLM自检和两阶段纪律。
闭合Q-01至04：Spessa unknown双桥改typed port/probe；list JSON换最终实跑113例及后续全部file/fullName/status；34枚补实际恢复后三态JSON/raw/执行数/退出码/目标AssertionError/hash；统一15测试+1fixture数量并修F1未点overlay却称恢复的证据矛盾。
继续未完Q07/Q08/Q10及其它残余组，原700合法未重复例/50组/50有效反控/10实际非剧情流程保留；逐合同旧断言与caller举证申请缩围，不拿grep数量代替。评估mkdtemp复制模块树+合法小输入的CLI路径，不写真实raw/extracted或运行主工程；新原版机制/剧情/碰撞轴仍停线交primary证据。
仍钉派发基点8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380；不得cherry-pick Codex共享审查提交或改基点绕过白名单，源漂移先交Codex。
最终实跑JSON/截图/源hash一致，串行reforge/game/pal-extract全包test/typecheck、根lint完整0/0/0、docs/diff/verifier后推送完整候选SHA。产品/旧测/配置/官方baseline/O/P/共享文档/真实工程/E2E只读，不合main、不标done、不清树。
```

## Codex 二审（2026-10-01，r2）

测试树`042dd8bbb3243e3a0d8a33add322631f93337855`，远端tip
`b20c8067fca7fa786fd2a40a3fa443dd409a5b8e`，后者确仅receipt pin。
[r2独立复核](../../testing/glm-tenfold-triple/codex-q-r2-review-20261001.md)、
[机器证据](../../testing/glm-tenfold-triple/codex-q-r2-review-20261001.json)为当前交接结论。
Codex **counter，保持rework**；以下关闭项不重开，原700/50目标未缩，未合main/未done。

- Q-01关闭：两处unknown双桥删除、typed类观测，audio新实跑12/12。
- Q-02关闭：最终16文件/115例file×fullName×status与新实跑逐条相同。
- 串行全包5297（2150/2788/359）全绿；typecheck×3零诊断、根lint2905文件完整0/0/0；docs/diff/verifier全绿。
- Q-R2-01：34枚正/恢复绿、变异恰一业务红、执行数一致；但仅30枚hash与最终源匹配。
  Q03-RC1～RC4登记fcd54104…，042dd8bb中audio实际5f1f78ff…，三态hash均不对应；须真实重采，不能只改hash。
- Q-R2-02：cli-isolated:186/200两条60000超时违反协议，删扩大超时并默认门复跑；mkdtemp隔离与两合同路径本身成立。
- Q-R2-03：不批准Q07/Q08整体縮围。接受已证具体轴排重/既定停线，但22族未对应全残余；Reforge证据不能替game，“成本高”不是headless不可达。700例/50有效反控保留。
- Q-R2-04：16+1 headline正确，Q01行仍错计7（实际6测试+fixture）；receipt shortfall仍113，候选SHA为短字符串。修准确最终口径。
- F1撤回恢复宣称与metadata一致，11截图hash相符，抽看4张；不把autoplay恢复或console零当已验。
- D-Q01-1已用当前合法存档/PNG+外部getThumb IO拒绝独立确认1未处理拒绝/exit1，
  [另列产品draft](REFORGE-OPENING-LOAD-ERROR-1.md)，不授权GLM修产品。

### 下一位 GLM Q 提示词（r3，取代上一轮返工提示词）

```text
继续 TEST-GLM-WAVE-Q-1，原分支 codex/glm-wave-q-runtime-residual-r1；测试起点042dd8bbb3243e3a0d8a33add322631f93337855，docs-only tip b20c8067fca7fa786fd2a40a3fa443dd409a5b8e。当前rework，不合main、不标done。
先读 /Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-Q-1-runtime-residual-tenfold.md 的r2二审段与所链codex-q-r2-review/机器证据，再读共同协议和GLM自检。
Q-01/Q-02与F1撤回已闭合，不重复返工。Q-R2-01：在最终格式化audio文件上真实重采Q03-RC1～RC4正/变/恢复JSON/raw/退出码/执行数/业务断言/三态hash，不能只改hash；其它30枚保留，最后全部34枚重核hash。Vitest rejects序列化Error前缀不单独判环境红，保留原文。
Q-R2-02：删除cli-isolated两条60000超时，保留默认门、子进程失败/取消收尾，复跑两例及pal-extract全包/typecheck。Q-R2-04：Q01行6测试+fixture、receipt115及完整40位候选SHA准确生成，后续新增时同样以树为准。
Q-R2-03缩围未获准：700合法未重复例/50有效反控保留，连续做未完合法残余。逐源未命中条件/caller/合法输入/旧file+完整fullName+断言行/oracle/剩余反例分类；Reforge不能当game真值，集成成本高不等于不可达。具体已证轴不重做；剧情、新原版机制/碰撞真值仍停线，不凑数、不扩权。
只写原Q新测/专属fixture/wave-Q证据；D-Q01-1是独立产品draft，不夹修，不改产品/旧测/配置/官方baseline/O/P/真实数据/E2E/共享文档，也不cherry-pick Codex共享审查提交。
派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变；最终实跑JSON与证据一致，串行三个Owner包test/typecheck、根lint完整0/0/0、docs/diff/verifier后推送完整候选SHA与诚实未完账。official ratchet/protected fast/并集结算/合main/done仅Codex。
```

## Codex 三审（2026-10-01，r3）

测试候选 `ada23d3e659f3239d6ac7e65d467711c19d061a9`，本地/远端tip
`efff13afeb0b22f44e45860dfbe38fb39bd59864`；其后确仅receipt pin。
[r3独立复核](../../testing/glm-tenfold-triple/codex-q-r3-review-20261001.md)、
[机器证据](../../testing/glm-tenfold-triple/codex-q-r3-review-20261001.json)为最新交接。
**counter，保持rework**；原700/50不缩，未合main/未done/未正式结算。

- 关闭Q-R2-01旧四针：Q03-RC1～4三态hash/12例报告与最终5f1f78ff audio匹配；
  全39枚证据复算，未冒称独立执行全部39变异。
- 关闭Q-R2-02默认超时：CLI无自定义超时，3/3绿；DATA15chunk及mkdtemp隔离公开CLI合同成立。
- 独立全包5298（2150/2788/360）全绿，16文件116条与directed逐条一致；
  typecheck×3、docs/diff、716源/429白名单路径零问题。
- Q-R3-01：Q10五枚meta均匹配最终e46949e5…，总索引却仍30f0d88d…且五个mutantHash也错。
  独立临时副本五枚均3执行/恰一目标业务红、恢复3/3；只须同步最终索引，业务旧成果保留。
- Q-R3-02：最终lint15格式error（Q10五枚×三态JSON），不是receipt所称0/0/0；正常格式化后完整重跑。
- Q-R3-03：receipt candidateHead仍短SHA+说明，Note仍r2；contracts仍113，缺Q10三条，
  C099～C113 game误记reforge，模板字段须落逐合同锚点。116数量/6+fixture子项已闭合，不重开。
- Q-R3-04/COMMON-01：Q08第6/8/10行具体旧断言成立，不覆盖整族；
  第8未给perform/select、第10未给capture，表/结论仍引Reforge及宣称headless不可达，
  与r3展开计划矛盾。接受继续逐合同展开方向，不批准整体缩围。
- 浏览器证据r3未改，不重复既有流程；F1撤回仍闭合，D-Q01-1产品draft独立，GLM不得夹修。

### 下一位 GLM Q 提示词（r4，取代上方r3提示词）

```text
继续 TEST-GLM-WAVE-Q-1，原分支 codex/glm-wave-q-runtime-residual-r1；测试起点ada23d3e659f3239d6ac7e65d467711c19d061a9，docs-only tip efff13afeb0b22f44e45860dfbe38fb39bd59864。当前rework，700/50不缩，不合main、不标done。
先读 /Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-Q-1-runtime-residual-tenfold.md 的r3三审段及所链codex-q-r3-review-20261001.md/json，再读共同协议与GLM自检。
Q03四针hash、CLI默认超时与DATA隔离合同已关闭，不重复返工。Q10五枚Codex临时副本均已真实复现单目标业务红；保留meta/JSON成果，以最终meta重建counters.json并断言全部39枚index/meta/实际original-mutant-restored SHA256对应。测试源不变则只修索引，不重造业务；源再变才按最终文件真实重采。
正常格式化Q10五枚三态JSON（15诊断），重核登记证据hash，根lint必须完整0/0/0。receipt candidateHead只能完整40位测试提交SHA，docs-only说明仅在独立Note并改r3/r4正确口径；最后结果按最终树更新，不能拿2925零诊断旧报告冒称当前通过。
contracts补三条Q10事件/截断/DATA合同并将C099～C113的package修game；每条 source/caller/oldAssertion/axis/精确oracle/classification落真实锚点，file/fullName对齐最终实跑，不用模板替代逐合同排重。
Q08第6/8/10的具体旧证据认可，不重造；第6无空槽测试不能扩成全部正向槽复用，第8sorting不能代perform/select，第10escape动画不能代capture/flee全族。同步ledger表/结论，撤掉game行Reforge证明与未证headless不可达泛化，执行typed game driver/其它余族逐条件展开计划；缺合法输入逐项举证申请，700合法未重复例/50组/50有效反控/10真实非剧情流程仍保留，不灌水、不扩原版真值。
只写原Q新测/专属fixture/wave-Q证据；D-Q01-1另卡draft不夹修。派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，不cherry-pick共享Codex审查提交，不改基点绕白名单。
最后串行reforge/game/pal-extract全包test/typecheck、根lint完整0/0/0、docs/区间diff/verifier；最终directed file×fullName×status与实跑对应，推送完整40位新候选及诚实未完账。产品/旧測/配置/baseline/O/P/共享文档/真实数据/E2E只读；official ratchet/protected fast/并集结算/合main/done及清树仅Codex，不自行操作。
```

## Codex r4 候选/反控证据预审（2026-10-01，非整包复验）

真实候选 `9da8354d4e7c706d0c9e1fc70035b351807bf3a3`、docs-only pin
`86d2a4c42925ce636691ca573baa5eada94e940e`，**counter，保持 rework**。
[预审详情](../../testing/glm-tenfold-triple/codex-zcode-pq-preflight-20261001.md)、
[机器记录](../../testing/glm-tenfold-triple/codex-zcode-pq-preflight-20261001.json)。

- Q-R3-01 证据层关闭：全部39枚 index/meta/实际 original-restored/rebuilt-mutant SHA
  对应，三态 JSON 执行身份/单目标红/退出码/恢复绿齐；Q10五枚各3执行。
  这是复算，不冒称本轮独立执行全部39变异；旧业务独立五针结果保留。
- Q-R4-PIN：receipt candidateHead/Note 所写 `9da8354dc6b1c68ee8aee42c66f577c93d38c2a6`
  不是本仓有效对象（git cat-file exit128），应以真实9da8354d4e7…回填；Codex此前转录也已纠正。
- 活动 Q07/Q08/Q10 合法余族可继续，仅修白名单receipt对象/Note，不重造未变hash/业务针；
  新最终报告/合同与全包/静态/视觉仍待独立核验，700/50不缩，未正式结算或done。
  待 UI 通道恢复由 Codex直接发此窄补充，用户无需搬运；不向运行会话重复投喂。

## Codex r5 固定候选预审（2026-10-01）

测试树 `63129473574ac21a082d1c5902b1fddfe62b02d7`，docs pin
`c05edb4e9fb4b32bf258848e2581a53137288650`；**counter，保持rework**。
[窄返工与逐源裁决](../../testing/glm-tenfold-triple/codex-zcode-oq-preflight-20261001.md)、
[机器复算](../../testing/glm-tenfold-triple/codex-zcode-oq-preflight-20261001.json)。

- 新receipt对象有效，旧Q-R4-PIN关闭；44枚index/meta/hash/三态身份与最终directed对应，
  保留旧证据，不冒称本轮独立重跑44枚。716源/480白名单路径/diff通过。
- Q-R5-01：battle-action-error-arms:352–362四空status强转、两缺字段数组强转需合法typed化。
- Q-R5-02：performItem缺entry/count0两合同重复actions.test:2317–2371，不计新。
- Q-R5-03：未声明magic/learnedSpells不足以证typed不可构造；先核caller/公开seed，
  不准夹产品接口补字段；capture误设行收窄，不造新机制。
- Q-R5-04：窄修后重采受影响Q08针、同步123/44账与真实全包数；未变旧39枚、
  默认超时、D-Q01-1产品draft保留。不把两种统计相加冒称正式收益。
- 未新整包/官方结算，123仍作者运行规模；700/50组/50有效反控不缩。
  仅实际空闲无相同排队时由Codex直接发窄项后续余族；不打断、不合main、不done。

### Q-R5-03 一手调用链补核（2026-10-01）

固定测试树 `63129473574ac21a082d1c5902b1fddfe62b02d7`；**仍 counter/rework**。
学习法术 `magic` 路径已有合法 typed 输入，不能以缺产品字段为由停测或缩围：

- `packages/shared/src/tables.ts:560–562` 已声明 `PlayerRole.magic?: number[]`。
  作者 ledger 引接口起始行482后断言“未声明该字段”不成立；也不必采用先前预审提及的
  结构化扩展方案。`learnedSpells` 是另一 fallback，不因本次核验自动获准或被证不可达。
- `packages/game/src/core/game-state.ts:552–569` 的公开 `PlayerRolesRuntime.rgwMagic`
  是32槽×6角色矩阵；`:1881` 创建完整 GameState，`:1394` 的 hydrate 接完整静态角色，
  `:1577–1670` 的公开 `projectRuntimeToBattleRoles` 将槽投影为 `role.magic`。
- `packages/game/src/shell/bootstrap.ts:1197–1201` 的真实 startBattle caller 正是该投影；
  `core/battle/battle-system.ts:1033–1080` 读取已学槽并判 resolve/costMP/MP/威力，
  `:1372` 的 Force caller 实际消费 `pickAutoMagic`。不需私有态、双桥或产品接口修改。
- 用完整 typed role/BattleState，合法填 `role.magic`，或经 create/hydrate/rgwMagic/投影
  进入同一公开入口。先对照旧 `core/battle/__tests__/battle-system.test.ts:1089–1119`
  两条 signed-negative 回归及其它旧断言，逐源条件展开原已批准余族；不复制旧双桥或换号凑例。

五个证据文件候选 blob 与原冻结逐字相同，SHA256 已记入
[机器补核](../../testing/glm-tenfold-triple/codex-zcode-oq-preflight-20261001.json)。
本次是源码/类型/caller 复核，不是新增业务实跑，不更改123例或44针通过数。
Q须撤回 `magic` 的 blocked-input/等待补产品字段表述，保留其它 counter；
源或执行集变化才重采受影响针，未变39枚保留。700/50组/50有效反控不缩。

待直接续派的单行 ASCII 补充（**尚未发送**，仅实际空闲且无同任务排队时使用）：

```text
TEST-GLM-WAVE-Q-1 Codex primary-source follow-up: continue only in /Users/zhangxu/.codex/worktrees/glm-wave-q/type-pal on codex/glm-wave-q-runtime-residual-r1, with the original whitelist/base/freeze unchanged. Read the latest Q card and codex-zcode-oq-preflight-20261001.md/json in the acceptance tree. Q-R5-03 is now verified: packages/shared/src/tables.ts:562 already declares PlayerRole.magic?: number[], and core/game-state.ts:569,1577,1670 plus shell/bootstrap.ts:1197 provide the real public typed runtime projection into battle roles. Withdraw the magic blocked-input/product-field claim; use a complete typed role/BattleState or createInitialGameState, hydratePlayerRolesRuntime, rgwMagic and projectRuntimeToBattleRoles. No casts, private state, product changes or new mechanics. Deduplicate the old signed-negative tests and all prior assertions before expanding the approved resolve/costMP/MP/selection contracts. This does not authorize the separate learnedSpells fallback or shrink 700 cases/50 groups/50 controls. Keep Q-R5-01/02/04 and all previously closed items as recorded; recollect only controls whose source or execution set changed. Continue approved Q07/Q08/Q10 residual work, validate each batch, commit and push stages; no main merge, done, official gates or real data/story/E2E002 writes.
```

### 直接投递与误停止记录（2026-10-01）

最新窄项已出现于原Q会话第7条用户消息，包含原工作树/分支、固定候选、Q-R5-01～04、
已声明magic一手补核与合法余族续做；不是accept。Codex在Return后又补点了会切换含义
的发送/停止控件，用户指出Q被停止，新绑定已直接确认最新一轮“已停止”。
撤回中途“仍执行”表述，规则改为每条消息回车或点击**只触发一次**、随后仅只读核验。
工作树仍干净，HEAD `c05edb4e9fb4b32bf258848e2581a53137288650`；没有新业务交付。

短恢复尚未发送，当前模型菜单操作未核出改变。后续只在Q仍明确停止、未由用户恢复、
无排队时，用下段恢复已送达第7条，不重发整包/重造已关闭项。用户授权纯代码阶段优先
GLM-5.3、需要视觉再用GLM-5.3-Flash；仅空闲核实选择，不动账号/套餐/权限。
700/50组/50有效反控、原白名单/冻结、rework均不变，未合main/未结算。

```text
Resume the interrupted seventh user instruction for TEST-GLM-WAVE-Q-1. Continue that existing task ONLY in /Users/zhangxu/.codex/worktrees/glm-wave-q/type-pal on codex/glm-wave-q-runtime-residual-r1 as the only Q owner. Read the latest Q card in /Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal and preserve its closed items. Do not restart completed batches or repeat unchanged controls. Original whitelist base freeze targets and safety limits remain unchanged. Main product old tests shared docs baselines and real data remain read-only. Continue the narrow repair then approved legal residual batches and push stages. Do not merge main or mark done.
```

## Codex r6 独立复核（2026-10-01）

固定测试 `c4e55436117970a66cecb339cfb61593d1874209`、本地/远端docs-only pin
`2ebf42b84f6092947e1d35c6ac56901607eb1430`；**旧Q-R5-01～04关闭，整卡counter/rework**。
[独立结论与逐项返工](../../testing/glm-tenfold-triple/codex-q-r6-review-20261001.md)、
[机器证据](../../testing/glm-tenfold-triple/codex-q-r6-review-20261001.json)取代上方下一步，不追改历史。

- 完整typed slot、两performItem重复删除、七例公开hydrate/rgwMagic/project链成立；不复制signed-negative、不放行learnedSpells。
- 716/716冻结源、490白名单路径通过；directed17文件128/128与独立全包逐身份相符。
- 独立串行2150/2800/360共5310全绿，typecheck×3零；lint2950文件完整0/0/0、docs/diff/verifier通过。
- 45枚三态hash/执行集合/单目标红证据复算对应，旧39枚未动、RC3除名；独立实际重放六枚更新针，
  每枚12执行/恰一指定AssertionError/恢复12绿，退出码0→1→0，恢复源hash一致。
- Q-R6-01：contracts C104～110仍套旧动作/库存模板，未写真实pickAutoMagic/投影源条件/caller/旧断言/精确oracle。
- Q-R6-02：当前缺口仍44/50、ledger8b仍计已删两例、capture误设行N/A后仍续派；receipt最终/历史门需明确分列。
- Q-R6-03：costMP1一手是极限技门不是免耗位；RC7同威力保留先遇到296，axis却声称更高297。业务VALID保留，只纠正因果。
  改测试标题/源后仅重采该文件六针，未变39保留，不要求整包旧针反复重做。
- 128执行不是128条全部未重复的accept；700例/50组/50有效反控不缩，至少572例/5针与完整组账未完。
  继续原合法余族；不合main、不done、不跑官方结算。D-Q01-1仍独立产品draft。
- 用户已撤回ZCode直接操作授权；本轮零UI操作，后续只交用户可复制提示词，不自动恢复/发送/切模型/归档。

### 下一位 GLM Q 提示词（r6窄修后持续原卡；用户手动转发）

```text
继续 TEST-GLM-WAVE-Q-1，原树 /Users/zhangxu/.codex/worktrees/glm-wave-q/type-pal、原分支 codex/glm-wave-q-runtime-residual-r1，唯一Q Owner。固定r6 c4e55436117970a66cecb339cfb61593d1874209、pin2ebf42b84f6092947e1d35c6ac56901607eb1430；派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，当前counter/rework。
先读本卡最新r6段及 codex-q-r6-review-20261001.md/json（均在 /Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal），以该审查的完整「下一位GLM Q提示词」为准。Q-R5-01～04已关闭；不要重复返工完整slot/两库存删重/七例magic公开投影/未变旧39针。独立全包2150/2800/360及typecheck×3、lint2950完整0/0/0、docs/diff/verifier已过。
先修Q-R6-01～03真实合同账、最终/历史数量报告、RC7真实因果与极限技标签；测试源/标题改变仅重采本文件六针，未变39枚保留，最终directed/contracts/fullName/hash对应。然后连续已批准Q07/Q08合法typed生命周期/行动相位/正向空槽余族及Q10 mkdtemp合成公共CLI，每批定向+相邻+typecheck、阶段提交推送后继续下一合法批，不等待搬运。不重开capture误设N/A行，不测试未批准learnedSpells，不夹D-Q01-1产品修复。
700合法未重复例/50组/50有效反控/10实际非剧情流程不缩，现128执行/45有效针、至少572例/5针与完整组账未完；逐源条件/caller/合法输入/旧完整fullName与断言行/精确oracle排重，不凑数，缺合法合同逐项举证。只原白名单新测/专属fixture/wave-Q证据可写；产品/旧测/配置/baseline/共享文档/O/P/真实数据/E2E只读，禁止unsafe桥/ignore/扩timeout/业务核心mock/私有态/降规则/PAL剧情或世界后门。新真值/无合法输入/冻结漂移只停受影响组。最终串行三包全测/typecheck、lint完整0/0/0、docs/diff/verifier，推送完整真实SHA与单独docs-only说明；不合main、不标done、不跑official ratchet/protected fast、不清树。
```


## Codex r7 最新独立复核（2026-10-01）

固定本地/远端 `fddc88a6060d644fd1b4fcf9e27dbff457a293b5`，**counter / rework**。134最终身份匹配；新game2805/pal-extract361全绿及typecheck零，未变Reforge2150/typecheck复用，总5316。lint2971文件0/0/0、docs/diff/716冻结/541白名单通过。极限技门/同威力先遇296/RC7因果关闭，旧typed投影/删重/default timeout保留。Q-R7-01 README称已改但最终contracts C104～110仍库存模板；Q-R7-02新room0例重复旧1503-1511，主链旧1459-1479已有正向复用/清毒/脚本/位置，加强轴只核真实缺口和独立oracle；Q-R7-03 game2804/ledger129-45及旧39未动口径不对，实际34旧未变+6Q08/5Q10更新+5新；Q-R7-04 50存档对应44不同目标，至少6目标与原700/50组未完。原目标不缩、不拆标题凑数。

[详细判定与下一步](../../testing/glm-tenfold-triple/codex-opq-latest-review-20261001.md)、
[机器证据](../../testing/glm-tenfold-triple/codex-opq-latest-review-20261001.json)。
本轮未合main、未done、未官方覆盖结算、未新视觉；不写贡献者树，不自动投递。
用户手动选择GLM-5.3后转发以下代码提示词；P视觉另阶段手动选Flash。

### 下一位GLM Q代码提示词（本轮最新）

```text
继续TEST-GLM-WAVE-Q-1，唯一Q Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-q/type-pal、分支codex/glm-wave-q-runtime-residual-r1，固定fddc88a6060d644fd1b4fcf9e27dbff457a293b5。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-Q-1-runtime-residual-tenfold.md最新段和同树docs/testing/glm-tenfold-triple/codex-opq-latest-review-20261001.md/json。旧typed slot/两performItem删重/七例公开投影/默认timeout以及极限技、同威力先遇296与RC7因果已关闭，不重做。按Q-R7-01～04补最终contracts C104～110等真账，查实际blob避免生成器覆盖为库存模板；0x9E room0新增例已有旧证不计新，旧1459-1479 reset/清毒/脚本/位置不可重算，独立更强轴逐条件举证，fallback位置用一手独立oracle。数量同步game2805、134/50/18，三态来源34旧不动+6Q08和5Q10更新+5新S1；50存档只有44不同目标，至少补6个真正新合同目标，不拆标题/换数字凑数，保留历史有效针，源/执行集改变仅重采受影响。连续原Q07/Q08合法typed余族与Q10 mkdtemp合成公共CLI，700例/50组/50不同目标/10流程不缩；避让grok-cursor-large/targets.json中Grok46保留源的新主合同，既有测试与原窄返工保留。game/pal-extract与Reforge阶段分开，派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变；只原Q白名单新测/fixture/wave-Q可写，产品/旧测/配置/baseline/O/P/真实数据/共享文档只读，D-Q01-1产品draft不夹修，不走PAL剧情/E2E002/世界后门，不测未授权learnedSpells/capture误设行。每批定向相邻/typecheck阶段推送，最后全包/静态零/docs/diff/verifier和完整真实SHA；不合main、不done、不跑官方门、不清树。
```


## Codex r8 独立复核（2026-10-02）

固定本地/远端 `7e115b4dd2e59f78a2fbbb4beb535c9085ffeab2`，**counter / rework**。新game2805绿/typecheck零，完整包与配置锁相同Reforge2150/extract361及typecheck复用，合计5316；134最终执行身份匹配。lint2999文件完整0/0/0、docs/diff/716冻结/611白名单通过。投影真账/S1非空毒与身份/独立固定fallback oracle关闭，NT1～6六新目标独立重放通过，连S1及NT8共10针30相新跑。57存档中56满足单业务断言红，50执行目标；45旧组未变/5S1更新/7新增。NT8为expect前普通产品Error，非AssertionError且同旧目标，退役不换针；C114room0及S1-RC4旧合同/反控不计新配额，净新上限133、缺口至少567、新合同目标上限49，合法余族至少补一目标。ledger当前129/45/17、C115待改分类与receipt同步；保留旧闭合项，700/50组不縮。

[详细判定与下一步](../../testing/glm-tenfold-triple/codex-opq-r8-review-20261002.md)、
[实跑与逐针机器证据](../../testing/glm-tenfold-triple/codex-opq-r8-review-20261002.json)。
本轮无新视觉、未合main、未done、未正式覆盖结算；不写贡献者树、不自动投递。
以下代码阶段请用户发送前手动选 **GLM-5.3**；P视觉另阶段手动选Flash，不混派。

### 下一位GLM Q代码提示词（覆盖旧交接；用户手动转发）

```text
继续TEST-GLM-WAVE-Q-1，唯一Q Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-q/type-pal、分支codex/glm-wave-q-runtime-residual-r1，固定7e115b4dd2e59f78a2fbbb4beb535c9085ffeab2。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/glm-tenfold-triple/codex-opq-r8-review-20261002.md/json及原卡最新段。投影真账、S1非空毒/对象身份、固定fallback oracle、NT1～6六新目标已关闭，不重做；56存档满足业务单断言红，50执行目标不等于50净新合同目标。NT8普通产品Error非AssertionError，退役保留历史，无需换针；C114room0已证旧合同不计新，S1-RC4历史针不计新配额。同步134执行/净新上限133/缺口至少567、ledger当前口径、C115已修分类/game2805/lint2999与三态来源45旧未变+5S1更新+7新增；后续合法余族至少补一真正新合同目标，不拆标题凑数。继续Q07/Q08 typed已核生命周期与Q10 mkdtemp合成CLI，700/50组不缩；避让Grok46保留源新增主合同。game/pal-extract与Reforge阶段分开，派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，仅原Q新测/fixture/wave-Q；产品/旧测/配置/baseline/真实数据/O/P/共享文档只读，D-Q01-1 draft不夹修，不测learnedSpells/capture误设行、不走PAL剧情/E2E002/世界后门。每批定向相邻/typecheck阶段推送，末批全包/静态0/0/0/docs/diff/verifier和完整SHA；不合main、不done、不官方门、不清树。
```


## Codex r9 独立复核（2026-10-02，最新）

固定 3593e8db21a2978c934aba31470f73af79b336f9、测试f28bcf1d34c13abebce38e2fbe69e895f6cc8b41，counter/rework。新extract362/typecheck×3零、完整字节相同Reforge2150/game2805全包证据复用，lint3019文件0/0/0、docs/diff/716冻结/661白名单过；18/135最终身份状态匹配。NT8退役/C114扣配额关闭。68B零流首次负回引-4032、78874越界bit读及无终止，4B header同输出；PAT576/768通道>63，C134不是合法新正控。5FP独立15相单红/身份/hash成立但同一目标，FP2/3实际RangeError→exit1不是宣称业务数量轴；正确结构61存档/51执行目标/净新目标上限50，当前合法新增目标上限49、用例合法性上限133/缺口≥567。合法修好这一真新目标就够，不要求四假新标题。51组业务三态未变+5Q10重采+5FP新增；修源仅重采受影响10CLI针。旧slot/投影/默认timeout/NT1～6不重开，原700/50组未闭，D-Q01-1另draft。

[详细结论与交接](../../testing/glm-tenfold-triple/codex-opq-r9-review-20261002.md)、[机器总证据](../../testing/glm-tenfold-triple/codex-opq-r9-review-20261002.json)。未写贡献者树、未自动投递、未合main/done/正式结算。代码阶段由用户发送前手动选 GLM-5.3；P未证视觉另阶段手动选GLM-5.3-Flash，不混派。

### 下一位 GLM Q 提示词（覆盖旧交接；用户手动转发）

```text
继续TEST-GLM-WAVE-Q-1，唯一Q Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-q/type-pal、原分支codex/glm-wave-q-runtime-residual-r1，固定3593e8db21a2978c934aba31470f73af79b336f9、测试f28bcf1d34c13abebce38e2fbe69e895f6cc8b41。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/glm-tenfold-triple/codex-opq-r9-review-20261002.md/json及原卡最新段。闭Q-R9-01～03：68B零流靠EOF/负回引归零不是合法YJ2，构造真实自包含位流/合法已产出回引/正确终止的65536B MAP，别加更多零或改生产decoder；PAT通道0..63，合法[1,2,63]仍应[4,8,255]，MAP/GOP/FBP对齐并保持mkdtemp隔离。FP2/3当前只是RangeError→exit1，非声明tileset/sprite数轴，改合法未引用MAP空块/合法YJ2 sprite等真轴或如实边界拒绝合同；五针同一个file×fullName，61/51/净新目标上限50，不是55/54，修好这一新目标就够补旧49→50，不另拆四标题。当前135执行/结构净新上限134但C134未接收，合法性上限133/缺口至少567；更新receipt旧57/50、三态真实51未变+5Q10重采+5FP新增与旧S1仅quota注记。正控源/执行集变动仅重采5旧Q10+5FP，其它未变51业务证据保留；NT8退役/C114扣配额、旧slot/投影/默认timeout/NT1～6关闭不重做。然后持续Q07/Q08 typed生命周期和Q10合法CLI余族，700/50组不缩，避让Grok46保留源。派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，仅原Q新测/fixture/wave-Q；产品/旧测/配置/baseline/真实数据/O/P/共享文档只读；D-Q01-1 draft不夹修，不learnedSpells/capture/剧情/世界后门。每批定向相邻/typecheck阶段推送，末批三包/静态0/0/0/docs/diff/verifier与真实完整SHA。不合main、不done、不官方门、不清树。
```


## Codex 最新独立复核（2026-10-02，r10）

固定751933d1524fce56e970a1615e1d5079867c0aa0，原合法MAP/PAT和真实FP2/3/4业务窄项accept，整卡counter/rework。新extract363绿/typecheck三包零、未变Reforge2150/game2805完整字节证明复用，3020文件静态0/0/0/docs/diff/716冻结/662白名单过；136身份状态对应。MAP8240B严格until终止、无EOF/负回引/越界，合法输入关闭；未用通用回引API多两bit使[7,7,7,7,9]变尾178，优先删未需API而非重造产品编码器。实际61存档/52目标/51原组未变，非62；FP4重定目标不增存档，room0扣一次，净新目标结构上限51已足50，不再补针；136执行扣C114后上限135/缺口≥565，若保守134需另排除且≥566。新3针9相过，源依赖变仅10CLI重采、其它51保留。700/50组未闭、不main/done/正式结算。

[详细审核与最新交接](../../testing/glm-tenfold-triple/codex-q-r10-review-20261002.md)、[机器证据](../../testing/glm-tenfold-triple/codex-q-r10-review-20261002.json)。只审固定候选、未写贡献者树、不自动投递。代码阶段由用户手动选GLM-5.3；P未证视觉另阶段手动选GLM-5.3-Flash。

### 下一位 GLM Q 提示词（覆盖旧交接；用户手动转发）

```text
继续TEST-GLM-WAVE-Q-1，唯一Q Owner，原树/Users/zhangxu/.codex/worktrees/glm-wave-q/type-pal、原分支codex/glm-wave-q-runtime-residual-r1，固定751933d1524fce56e970a1615e1d5079867c0aa0、测试d1414ec08b33996c0f71d6ac006fc6b84d580743。先读审核树/Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/testing/glm-tenfold-triple/codex-q-r10-review-20261002.md/json及原卡最新段。实际literal-only MAP/零帧sprite的严格EOF/回引/输出边界+真尾标、PAT0..63、FP2/3真实数量及FP4独立精确拒绝都已关闭，不重做非法零流旧修项。仅闭Q-R10-01～02：fixture未用通用backref API编码扩展多两bit，literal7+回引3个7+literal9实际末字节178非9；优先删未用回引/可选位模式/反查API，保留已需字面量+正确终止符并撤回回引全往返误报，不造产品级编码器、不改生产decoder。若保留须按primary总位长data2+6（扩展data2-2）修好并有真实字节往返与边界证明。账为61存档/52执行目标、51未变+5Q10更新+5FP更新，FP4只是重定一个目标不是新增一枚存档；C114/S1-RC4同一旧合同只扣一次，净新目标结构上限51，原50数量门已足，不再补针。136执行扣C114后结构上限135/缺口≥565；如保守134须列另一具体排除且缺口≥566，不能写564。同步README/receipt/index/quotaNotes/contracts与FP3及CLI旧注释，历史错误明确标历史。fixture依赖/CLI源或执行集变动仅重采受影响10CLI针，其它51保留。然后连续原Q07/Q08已核typed生命周期/Q10合法合成CLI余族，700/50组不缩，避让Grok46源；game/pal-extract与Reforge分阶段，D-Q01-1不夹修，不learnedSpells/capture/剧情/世界后门。派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变，仅原Q新测/fixture/wave-Q，产品/旧测/配置/baseline/真实数据/O/P/其它队列/共享文档只读。每批定向相邻/typecheck阶段推送，末批三包/静态0/0/0/docs/diff/verifier与真实完整SHA/准确未完账。不合main、不done、不官方ratchet/protected、不清原树。
```
