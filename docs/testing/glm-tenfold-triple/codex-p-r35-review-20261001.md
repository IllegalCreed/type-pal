# TEST-GLM-WAVE-P-1 r3.5 独立复核（2026-10-01）

结论：**counter / rework，非整卡完成**。旧四个拒收反例、恢复相判据和10枚索引patch修复成立；
变异相身份与真实未处理异常仍误收，失败退出跳过清理，docs门未过，原规模/视觉缺口仍在。
[机器证据](codex-p-r35-review-20261001.json)区分三态存档复算、真实进程探针与全包实跑。

## 固定对象与实际门禁

- 本地/远端HEAD `bb2ffcb6614a5f48eb5bb0bab671941242f2a00b`；
  工具/证据锚 `5e492fbeaacd2717ad70681f67d1cd150668d479`，后续仅receipt pin。
  测试代码仍为 `5899dae6057d73a852b37617635e823d2e388c58`；到HEAD仅wave-P证据/工具变化。
- 派发 `8b3ca062953b17a12178f8d1a9e36657971234b1`、冻结
  `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`不变。716/716冻结源、P288源、
  157路径白名单及ownerOverlap=0通过。
- 独立detached临时树offline frozen-lockfile安装，只复制gitignored migrated/runtime资产到副本。
  Editor **516文件 / 3853通过 / 0失败 / 0pending**；新67条file×fullName×status与最终directed逐条一致。
  随后串行typecheck零、lint **2804文件，完整0 error / 0 warning / 0 info**、diff/verifier通过。
- docs **exit1，两项**：`wave-P/browser/README.md`目录索引缺失、父README缺browser导航。
  全包有jsdom navigation未实现提示，不冒称console/stdout为零。
- 作者judge自测**14/14**，四个旧反例另外复核已拒收；不能据此推导未覆盖拒收轴。
- 10枚实际product original/restored及独立git apply rebuilt-mutant hash全匹配；
  三态完整身份、0/1/0退出、指定单业务红和恢复passed对应，索引patch10/10等于receipt。
  **未独立重跑全部10枚业务变异**；本轮不将工具缺陷改写为已有10业务记录全部无效。
- 浏览器文件未新增变更；66张登记截图SHA256全匹配，不是receipt旧55。
  作者18/20证明口径保留，F14/F18仍未证；本轮未新开浏览器或重验健康流程。

## 窄counter

### P-R35-01：变异相身份、真实harness和退出仍漏判（P1）

`tools/counter-judge.mjs:97–132` 的judgeMutant只比较数量，runner `counter.mjs:254–262`
未传positive身份。用实际P01-C01三态报告，仅把一个passed邻居fullName换成另一身份，
保持24执行/目标单红，仍valid=true、reasons=[]；恢复相拒收已修，不能代替mutant相比较。

另以真实Vitest 4.1.7进程执行单目标失败同时Promise.reject：
raw明确有“Vitest caught 1 unhandled error during the test run.”和CODEX_UNHANDLED_REJECTION，
JSON只有1条AssertionError、没有numRuntimeErrorTestSuites字段；candidate judge仍valid=true。
runner没把raw传给judge，依赖一个该版本JSON未提供的计数不能拒真实异常。
`exitCode=-1`的同报告也误收。要求三态完整多重集合/每条状态、真实harness区段/异常、
有效正常退出、signal/spawn统一判，并补真实进程拒收回归；不扫描整个JSON中业务标题的pending/todo词，
不误杀Vitest rejects的真实AssertionError序列化Error前缀。

### P-R35-02：process.exit跳过finally，失败树实际泄漏（P1）

`counter.mjs:52–55`的die直接process.exit(2)，`:237/271/277/295`在try内调用。
用未修改runner和合法P01-C01变异，只登记故意错误fullName：
实际exit2 / mutated invalid: wrong-fullName，却留下已登记detached worktree
`glm-p-counter-CODEX-R35-CLEANUP-PROBE-B8ginS`、HEAD等于候选。Codex只清理此自建探针树；
其他作者遗留树未触碰。建树/依赖复制还在try外。

改用throw到外层、finally覆盖所有本次资源，再设置exitCode；补positive/target拒收、
建树/复制异常等真实失败回收验证。仅清本次mkdtemp树，不全局prune、不清其他Owner数据。

### P-R35-03：docs与当前数量/三态来源（P2）

在原wave-P白名单补browser/README及父导航，重跑docs归零。
README/receipt剩余630应**633**，receipt自测10应14、截图55应66。
相对48ade，30个三态JSON的字节和startTime全部改变、身份/status都保持；
故“十针证据未动/未重采”不对应存档diff。准确区分业务针位不变与原始报告重采/替换来源，
不改历史数、不要求循环自引用HEAD。测试锚/工具证据锚/docs-only pin独立登记。

### P-R35-04：P-R2-02合同账与原规模仍未闭合（P2）

G09三条重复删除保留，不重开。现67行oracle仍同一个“directed实跑断言…”模板，
四行oldAssertion仅“同上”，部分没有旧fullName/断言行及源条件；不能由全绿确认67净新增合法合同。
逐合同补真实条件/caller、合法输入、旧fullName及断言锚、完整matcher/预期值与分类，
不是制造新模板。原**700例/70组/50有效反控/20流程**不缩：
当前67/14/10/作者18，P02残余/P03–P10及F14/F18继续，不因上下文不足自行缩围。

## 边界与交接

不写贡献者活动树，不操作ZCode，不合main、不标done、不清退休树；
未运行正式check/ratchet/protected fast或结算main覆盖率。所有新针/源变动仅重采受影响部分。

### 下一位GLM P提示词（用户手动转发，覆盖历史自动续派）

```text
继续 TEST-GLM-WAVE-P-1，原树 /Users/zhangxu/.codex/worktrees/glm-wave-p-editor-residual/type-pal，原分支 codex/glm-wave-p-editor-residual-r1，固定审核候选 bb2ffcb6614a5f48eb5bb0bab671941242f2a00b。先读 /Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-P-1-editor-residual-tenfold.md 最新 r3.5 独立审核段及所链 codex-p-r35-review-20261001.md/json，按 P-R35-01～04 窄返工：mutant 对齐完整多重身份；真实未处理异常/raw harness/signal/spawn/无效退出拒收；throw+finally 覆盖建树/复制/各拒收分支并仅回收本次树；补 browser 目录索引导航，修633缺口/14自测/66截图与三态证据重采来源；逐合同补真实条件/caller/旧fullName断言行/完整matcher和值。旧四拒收、恢复判据、10索引patch、G09删除与既有业务证据保留，源或执行集改变才重采受影响针。再连续原P02残余/P03～P10与F14/F18，700合法未重复例/70组/50有效反控/20流程不缩，不凑数，缺合法轴逐项举证申请。只写原P新测试/专属fixture/wave-P白名单；派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变。最终定向JSON与源hash一致，串行Editor全包test/typecheck、lint完整0/0/0、docs/diff/verifier后推送40位候选；产品/旧测/配置/官方baseline/真实数据/O/Q/共享文档只读，不合main、不标done，不操作其它会话。
```
