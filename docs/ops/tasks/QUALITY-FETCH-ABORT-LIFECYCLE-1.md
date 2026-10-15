# QUALITY-FETCH-ABORT-LIFECYCLE-1 — GET重试等待期与Request取消停止线

Status: draft
Owner: Codex
Reviewer: Codex（当前源码与真实IO复核，不冒充第三方）
Phase: phase1 game / network lifecycle
Capability: global fetch cancellation boundary
Visual Verification Timing: N/A（Promise/计时与请求生命周期，不改变UI）

## 直接事实与当前停止线

基点dfd03a811，唯一codex/code-quality-3y，main=f98d0ddd8。全文读取fetch-retry.ts、三测试、main.ts、boot-loading.ts、audio-midi.ts及[历史CODE71](../archive/tasks/done/CODE-QUALITY-71-game-fetch-retry-abort-boundary.md)。现实现只在底层reject后核init.signal.aborted或错误名AbortError；backoff的setTimeout不监听signal，也未读Request.signal。未修改生产代码。

[真实HTTP/原生fetch原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/fetch-retry/real-abort-proof.json)与raw/命令回执确认：Node22.23.2本机HTTP返回503，独立观测仅拦截本任务独有的314159ms退避timer并由观察者显式放行，不使用fake transport、核心mock或wall-clock等待。source SHA/全局恢复、timer归零与server关闭均记录。

| 场景 | 取消时的直接状态 | 观察者放行退避后 |
|---|---|---|
| 原生fetch，Request已取消且reason为普通Error | 原始reason拒绝；0条HTTP请求 | 无重试层 |
| wrapper经init.signal，在503后的退避中取消 | Promise未结局、1底层调用/1条HTTP、1个backoff仍持有 | 放行后第2次底层调用才以同reason拒绝；HTTP仍共1条 |
| wrapper传已取消的Request，reason为普通Error | Promise未结局、1底层调用/0条HTTP、1个backoff仍持有 | 两次放行后共3次底层调用才以同reason拒绝；HTTP始终0条 |

“底层调用”不等于发出HTTP，不能把3次调用写成3条网络请求。此探针没有实测浏览器UI/音频故障、没有等待314159ms，也不证明已发生永久内存泄漏；它直接证明未结局Promise与未清退避。音频doPlay/stop/dispose的generation/disposed守卫仍存在，未宣称取消后会播放旧曲。

## 四向真值与反证

| 维度 | 证据与结论 |
|---|---|
| Primary | [WHATWG Fetch方法](https://fetch.spec.whatwg.org/#fetch-methods)先核Request.signal；[abort fetch](https://fetch.spec.whatwg.org/#abort-fetch)以原reason拒绝Promise并处理body。[DOM AbortSignal](https://dom.spec.whatwg.org/#aborting-ongoing-activities)说明取消原因与未结局操作。当前原生正控与真实HTTP是本次执行证据。 |
| 第一阶段 | 历史CODE71已明确“AbortError或已取消Signal必须立即传播，不能继续请求或等待backoff”；本次反证说明旧单一伪transport AbortError例没有覆盖完整取消域。main.ts:20安装全局wrapper；audio-midi.ts的曲目/音色库fetch及stop/dispose是真实init.signal caller。 |
| 第二阶段 | N/A；editor/reforge未安装此game全局wrapper，当前不扩大跨包产品范围。 |
| 任务目标 | 按既有CODE71与Fetch合同，取消时立即以原reason终结、清退避/监听器，不再进入后续attempt；同时保持GET/状态码/次数/方法与HTTP结果合同。 |

最强替代解释：retry wrapper可以主动约定不响应等待期取消。但现有CODE71直接规定不得等待backoff，该解释不符合已核目标。Node与浏览器具体网络调度可能不同；关键定时等待没有signal监听是当前源码直接事实，若实际Promise在放行前已以原reason拒绝且timer清零，则本前提被推翻。不能凭此替换音频状态机、扩大为通用retry框架或改资源格式。

## 可审阅方案与准入条件

方案：限定fetch-retry.ts的有效signal选择（init覆盖Request）与可取消退避；已取消signal不进入下一attempt，等待中abort时清timer/监听器并以signal.reason拒绝，正常timeout与所有异常路径都清理。不得只race Promise却留下timer/监听器，不新增重试开关或改变公开签名，不改其它包/音频/资源。自定义reason可不是AbortError，也不能因改名继续重试。

本卡当前仅draft，没有build allowed；先在独立后续切片核定白名单、把已取消Request/等待中取消的失败反例写实，包含正常退避正控、init覆盖Request、默认AbortError/自定义reason、零次重试和释放反控，再核实现准入。保持既有已核取消合同不涉及新的产品取舍，不重复让用户选择已在CODE71决定的策略；若发现新取舍或需改变公共签名，仍交用户裁决。三份现有测试中其它已定合同的补证可独立继续，不由本卡授权修改生产。

## 交接

fetch-retry.ts旧整文件关闭因直接counter撤回rework；旧CODE71的done只保留历史，不重写旧门回执或预签当前通过。全仓门/editor诊断未清，不合main；全部83卡与94–102/editor原目标继续。无下一位Agent提示词，Codex单Agent继续。
