# Wave Q r2：Codex 独立复核（2026-10-01）

结论：**counter，Q卡保持 rework**。Q-01、Q-02和F1撤回表述已闭合，三包门禁复跑绿；
但四枚反控不对应最终源、新CLI用例扩大超时，缩围证据不足且任务仍部分交付。
不合main、不标done、不清树，不运行官方ratchet/protected fast或正式覆盖结算。

## 候选与独立复跑

- 测试候选 `042dd8bbb3243e3a0d8a33add322631f93337855`。
- 远端/本地tip `b20c8067fca7fa786fd2a40a3fa443dd409a5b8e`；其后差分确实仅receipt pin一行。
- 派发 `8b3ca062953b17a12178f8d1a9e36657971234b1`；冻结
  `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`，均未改。
- 在Q候选串行执行 `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/<pkg> test`
  （追加JSON reporter/outputFile），每包之后typecheck，再根lint、docs、区间diff、verifier。

| 包 | 全包实跑 | Q新文件 / 用例 | typecheck |
|---|---:|---:|---|
| reforge | 2150/2150 | 13 / 98（audio文件12/12） | 零诊断 |
| game | 2788/2788 | 2 / 15 | 零诊断 |
| pal-extract | 359/359 | 1 / 2 | 零诊断 |

总5297例绿。最终directed JSON的 **16文件/115条 file×fullName×status** 与新实跑逐条相同，
无漏项/增项；duration不要求跨运行相等。Q-01两处unknown双桥已删除，真实替身类/typed
实例观测替代self反射。这里只关闭该返工项，不等于115条合法新合同及全部排重已穷尽accept。

根lint2905文件完整0 error/0 warning/0 info；docs815 Markdown/4278链接/245任务零问题；
`git diff --check 8b3ca062...HEAD`零诊断；verifier716/716源hash匹配、Owner交集0、
379区间路径全部在Q白名单。全包stdout有jsdom `HTMLMediaElement.pause()`未实现提示，
不冒称测试stdout/浏览器console全部归零；静态门本身为零。

命令、三包完整报告SHA256、115条实跑结果、反控账与独立产品红诊断保存在
[机器证据](codex-q-r2-review-20261001.json)。新完整报告在
`/tmp/codex-q-r2-review.foCNgP/{reforge,game,pal-extract}-full.json`。

## Q-R2-01：四枚反控最终hash仍不对应

读取全部34枚×三态JSON/raw：正控/恢复均全绿，变异均恰一目标业务断言红，三态执行数一致；
meta与索引一致，old/new锚点唯一。**仅30/34**原/恢复hash及重建变异hash匹配最终文件。
本轮没有另行执行34枚变异，不把读取证据和重建字节冒称独立反控实跑。

Q03-RC1、RC2、RC3、RC4均针对`packages/reforge/src/audio-spessa-runtime.glm-q.test.ts`：

- 最终042dd8bb与tip内该文件SHA256均为
  `5f1f78ff0eda105bb476df7d812dc943f639c2b009c1edef6148286a1f7feb5b`。
- 四枚记录的original/restored却为
  `fcd5410400adf30adf0820fb58d9f7855a571f107550905ce9c1acb7d0c909ca`；
  四枚mutated也与按最终文件重建的字节不同，精确值在机器证据。

必须在最终格式化文件上真实重采这四枚正/变/恢复执行，更新全部JSON/raw/meta/索引/hash；
不能只改hash字段或把中途代码的输出当最终输出。其它30枚证据完整性不因这四枚失效，
但本轮不把“34全VALID”整体accept。再次格式化后重核全部34枚。

判据纠正：若JSON失败首行为`Error: promise resolved ... instead of rejecting`，不能仅凭
Error前缀拒收。安装的`@vitest/expect@4.1.7/dist/index.js:1767-1782`实际构造
AssertionError，再以`new Error('rejects')`重写stack；本批该类输出是业务拒绝断言失败，
不是环境异常。保留原文，不要求改断言来伪造AssertionError文本。
Q09-RC3/RC4同fullName但分别针对正常RGBA与缺色回退两个独立观测断言，不因名称相同
自动判重复；Q03-RC2/RC3现在也确实分属透传与isReady拒绝。

## Q-R2-02：CLI隔离合法，但不得扩大超时

CLI复制src/package并将REPO_ROOT派生到mkdtemp树，RAW/OUT只在该树；两条合同真实执行，
正路径是事件段完成后因缺DATA拒绝，负路径是截断chunk0拒绝，未冒称整个提取成功。
因此撤销r1的“CLI不能隔离”阻塞；两个新增合同是有效推进，不授权写真实数据。

但`packages/pal-extract/src/cli-isolated.glm-q.test.ts:186,200`两条均设置`60000`超时，
违反共同协议“不得扩大超时”。新实跑耗时约397/359ms，不提供放宽理由。
删除增大超时，保留默认门并确保子进程失败/取消时不悬空、不泄漏；不得改共享配置/依赖。
默认门下重跑两例及pal-extract全包/typecheck。

## Q-R2-03：缩围裁决

**不批准Q07/Q08整体缩围，也不缩700例/50有效反控目标。**
同意已证的具体轴不重复；已授权边界外的剧情、新机制真值仍停线。

独立读了部分旧断言：game `event-system.test.ts:4476-4484`队伍/毒清除、
`:4531-4542`全队施毒、`:4586-4609`抵抗/去重、`:4671-4677`地图覆写；
`battle-opcodes.test.ts:722-744`状态/抵抗、`:1093-1111`治疗clamp/死人守卫；
`battle-progression.glm-next-wave.test.ts:26-40`level clamp。它们确可作为相应具体轴
existing-proof，不重新裁决原版公式真值，更不能由几个旧例推出整模块所有残余已证。

账的剩余问题：

1. 22条合同族不是逐未命中条件/具体caller对照；多行仍只有群名与用例数，没有完整
   old fullName/断言行或反例。例如行动队列、召唤/变身、逃跑/捕获。不能据此证明覆盖余池已空。
2. Q08是game域，但第4/11行引用Reforge的coop/session/round-flows。
   两阶段证据不能替换。`battle-session.*`文件实际在reforge，不是game。
3. “headless无法合法构造”不成立为总判据：所引
   `reforge/src/battle/battle-session.round-flows.test.ts:8-39`使用typed session-driver、
   公开按键/tick；`battle-session.glm-next-wave.test.ts:11-36`也经真实构造器，
   并非必须`__rfBattle`或真实剧情长路线。集成成本高不等于unreachable。
4. Q10 DATA/图像输入仍承认为后续未做；其它批残余没有全部可复核existing-proof。

GLM继续原合法残余批，不为数量造新机制/改私态。若申请局部缩围，逐条给包/源条件、
公开caller、合法输入、旧断言file/fullName/行号、精确oracle、剩余反例、分类与实际阻塞。
可以逐已证轴收窄，不接受“全部已覆盖/全部headless不可达”的概括结论。

## Q-R2-04：元数据小返工与浏览器

headline的16测试+1fixture/115例正确；但README Q01表格仍写7测试文件，实际是6测试+1fixture，
各行相加为17；receipt.shortfall.deliveredCases仍113。统一当下口径，历史另标。
receipt.candidateHead应为完整40位测试候选SHA，docs-only说明独立字段/注记，不混进SHA值。

F1 `overlayRecoveryClaim=withdrawn`与metadata/README一致；11截图hash全部复核匹配。
实际看了视频帧、空档浏览、参数错误画屏、合法店铺四张样本；图像与报告场景相符。
本轮未重复作者已取证浏览器流程；F1只接受媒体播放/跳过/到菜单，不接受autoplay恢复已验。
原始console中的save-state.json404/ERR_ABORTED为可选只读准入记录缺失，见
`project-save-state.ts:45-49`；F8非法money错误是预期负流程。没有把它们抹成console零。

## D-Q01-1：已独立确认，另列draft

[产品缺陷卡](../../ops/tasks/REFORGE-OPENING-LOAD-ERROR-1.md)记录根因与下一步，未修产品。
在临时复制树用当前typed save payload、合法m01 meta和有效PNG，先真实putSlot/read成功，
只在外部getThumb IO边界注入合法UnknownError拒绝，再经菜单键盘进入读档：
**1条断言绿，但1个未处理拒绝、进程exit1**。这是负诊断，不是候选全包失败。
Vitest JSON仍写success=true，故必须连同raw与exit读取，不能只看布尔值。

`opening-menu.ts:113-121`等待存储/图像IO，而`:138`的`void enterLoad()`没有catch或桥接
外层Promise；真实`IndexedDbSaveStore`读操作确会reject。它不是旧格式兼容/提取器问题，
也不依赖非法PNG才能触发。opening-menu与store源在冻结到当时main之间没有变化。
错误呈现/重试策略与build白名单尚待窄准入；GLM只保留红证据，不夹产品修复。

## 交接

Q卡新二审段有可复制r3提示词。仅修Q证据/新测试白名单并继续未完合同，原派发/冻结不变，
不cherry-pick Codex共享审查/新缺陷卡提交到Q分支。作者交新完整SHA后再复核。
official ratchet/protected fast、main并集实测及done仍由Codex执行，当前均未运行/未授予。
