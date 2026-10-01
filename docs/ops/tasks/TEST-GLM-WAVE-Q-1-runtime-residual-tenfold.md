# TEST-GLM-WAVE-Q-1 — 两阶段runtime与解码残余合同十倍测试包

Status: rework
Phase: mixed（Reforge phase2；game/pal-extract phase1，严格分段）
Capability: runtime-residual / test-coverage
Coding Owner: GLM Q（仅新测试与专属证据）
Reviewer: Codex（独立验收、集成和正式结算）
Visual Verification Timing: dev-functional（仅非剧情菜单/有限trial）
Branch: `codex/glm-wave-q-runtime-residual-r1`（新独立worktree）

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
