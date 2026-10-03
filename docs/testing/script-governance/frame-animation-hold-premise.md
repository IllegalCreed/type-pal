# 帧动画首帧揭示与显式清层合同

SCRIPT-GOV-3 的 s011 恢复核查证明，现有指令不能在独立的淡入和声音指令之间保持帧动画可见。
Root 已核准增加 `playFrameAnimation.holdLastFrame`、`initialFadeInMs` 和 `clearFrameAnimation` 显式能力。
作者正文仍只有步骤和指令；没有新增并行、播放器指针、存档状态或隐含淡入职责。

## 四向证据和反例

| 维度 | 直接证据 |
| --- | --- |
| 原始内容 | all.json:2235 out、2238 RNG0..112、声音与后续 RNG 分段、2249 out 后回世界。声音位置和帧区间是演出正文。 |
| 第一阶段 | event-system.test.ts:5285 证明 0x50 后的 RNG 首帧消费 needToFadeIn；shell/rng-player.ts:165 的 fadeInFirstFrame 先画首帧，再保持该帧完成 600ms 淡入。 |
| 当前二阶段 | FrameAnimationPresentationState.finishPlayback 把成功帧设为 buffered，visibleFrame 只接受 playing/dialogue；main play finally 无请求 token，旧请求结束可改变新请求模式。 |
| 目标 | 成功且本次实际收到帧时，可以显式保持最后帧可见，穿过 sound/wait/fade；首帧先显式淡入，明确 clear 后回世界。取消、替换、切场或读档不会让旧请求重新画入。 |

最强更小方案是用现有 `0..0 → fadein → 1..112`。它被 buffered 不可见的直接反例推翻：
首帧命令完成后，淡入露出世界；各分段之间的声音也可能露世界。holdScreen 只控制黑幕，不控制 CG 层；
借 enterDialogue 显示需要伪对白，因此也不充分。给整个帧播放器新增声音时间线比这些明确能力更大，
还会把作者正文搬进第三种编排，不采纳。

## 精确显示与所有权

省略 holdLastFrame 保持现有 buffered 合同。传 true 只在成功且本次收到帧时进入 held；
无帧、失败、abort 不能把旧 fallback 变成持久 CG。正常声效、等待、淡入淡出、clearDialog 不改变 held。
clearFrameAnimation 明确中止当前动画请求、丢弃缓存及可见层，立即回世界。

initialFadeInMs 必须非负有限，省略不产生任何 fade。首个本次帧先同步 present 并核 owner，
随后宿主执行显式淡入，再等待该帧正常时长，才进入下一帧。通用 decoder 只增加可选
onFirstFrameReady 异步回调，不依赖 fade driver。s011 因而直接播放 0..112，保留首帧
600ms 淡入之后的 62.5ms 帧等待；不拆首帧，不故意接受先黑等 62.5ms 的次序偏差。

传该参数时，宿主在加载本次首帧之前先取得自己的黑幕 owner，并在同一 gameplay 时间同步完成
零时长黑幕设置；初始 alpha=0 也是真正从黑揭示，不只是等待。取消和清层只收掉它仍拥有的幕布，
不能抹去随后普通 fade 或新播放已取得的幕布。

每次播放必须有独立的临时 owner/token 和取消域。新播放 supersede 旧播放；旧 decode 完成、onFrame、
finally 均先核 token，不能修改新请求。最后一次“检查 owner → 写帧/模式”在同一同步提交点完成。
只靠增添 held 枚举不能修旧 finally 竞态。

统一 reset invalidates 当前 token 并取消在途播放；abort、场景 commit、读档复位及退出复用它。
旧 reset/finally 只能收自己仍持有的 owner，不得清新的已接管层。所有这些 token、buffer 和 source 均在
呈现实例中，不进 World/SAVE11。teleportParty 当前不清 CG，作者需要先 clear；不能偷偷给它新增职责。

## 修改路径与验收

Content 的命令联合、strict 字段 guard、命令注册/执行安全表新增 optional bool、显式首帧淡入毫秒和无参清层叶；
共享编译器、宿主接口、适配器、Cutscene intent/controller、main 播放请求和 presentation owner 闭环。
Editor 命令菜单、摘要和参数表单保留新选项，预览日志明确保持/清层；引用与资源预取不受无资产清层叶影响。
业务 JSON 归 Content Owner，本 Owner 不并写。

反控覆盖：首帧保持下的独立 fade；多个 segment 与 sound/wait 的可见层连续；明确 clear；
无本次帧不保持 fallback；读失败/abort；旧 decode 在新请求后返回；旧 finally 在新请求后返回；
clear、同场重载、场景 commit、SAVE11 读回使旧帧失效。取源时长须单列：首帧播放自身 62.5ms 与淡入
600ms 是否先淡入再停留，不能用“首帧接上了”掩盖演出总时间或次序漂移。

Root 已在本任务内记 build allowed，版本统一随 content23 冻结，SAVE11 结构不变。
未完成真实宿主与全静态门之前，不报告完成；后期 s011 视觉按已登记入口集中验证。

本包交付验证：Reforge 10 文件 66 项定向测试、Editor 12 文件 149 项相关回归、Content 5 文件
85 项相关回归通过；三包 typecheck 与 58 个本包相关文件 Biome 零诊断。真实主壳反控包含初始透明、
慢解码清层、播放/淡入中替换、正式作者清层、场景 commit、SAVE11 读回及不越权收普通黑幕。
这是公共能力验收，不冒称 s011 已走过剧情视觉；该正文由 Content Owner 接续。
