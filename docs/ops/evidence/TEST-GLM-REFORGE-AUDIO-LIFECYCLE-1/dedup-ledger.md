# TEST-GLM-REFORGE-AUDIO-LIFECYCLE-1 排重账（GLM r1）

排重域：`packages/reforge/src/audio/` 全部旧测（`bgm.test.ts`、`bgm.runtime-boundaries.test.ts`、
`bgm.dispose.test.ts`、`bgm.glm-n.test.ts`、`midi-preview.test.ts`、
`midi-preview.lifecycle-boundaries.test.ts`、`midi-preview.play-guards.glm-n.test.ts`、
`midi-preview.glm-n.test.ts`、`midi-preview.glm-runtime-resource.test.ts`、`sfx.test.ts`、
`sfx.staged-failures.test.ts`、`sfx-readiness.test.ts`、`sfx-readiness.collections.test.ts`）、
caller 侧旧证据（`audio-spessa-runtime.glm-q.test.ts`、`video-sfx-ports.glm-q.test.ts`、
`battle-trial-host.glm-next-wave.test.ts` G02 生命周期）与全仓 fullName grep。
归档卡：D12-1（fade 过渡）、TEST-REFORGE-RUNTIME-CONTRACTS-1（C1-C6）、
TEST-GLM-NEW-G-1（G02 宿主）、TEST-REFORGE-ASSET-IO-1（B4 readiness 集合）。

## 新增合同（6 条；源锚 / caller / 合法输入 / oracle / 排重结论）

| # | fullName（节选） | 源锚 | 公开 caller | 合法输入 | oracle | 排重结论 |
|---|---|---|---|---|---|---|
| L1a | 手势 resume 成功 → 补播记账曲 | bgm.ts:266-278（resume 解锁后 playCurrent） | main.ts:305-312 每手势 resumeAudio；battle-trial-host.ts:198-205 | suspended ctx；autoplay 拒（首访）后手势解锁（resumePlan 注入） | 静默提交 1 次 → 解锁后重读+二次 loadNewSongList/play；ctx.resume 恰 2；两次提交字节身份一致 | C1 只证 resume 并发去重与被拒后旗标复位，gate 从未成功解锁过，「解锁后补播」正路径未证（bgm 头注释明文合同） |
| L1b | 负臂：无记账曲解锁不补播 | 同上 | 同上 | stop 清账后 suspended + 手势解锁 | play/load 计数不增 | 同上（C1 无 last 维度） |
| L2 | 同曲 steady-state 重复不重启 | bgm.ts:214-229（同曲守卫） | battle-trial-host.ts:229-232/256-257 playMusic；onExpReward 同曲复播 | running 且 playing 命中时重复 play 同 AssetId | 零重读/零重载/零重启 + cancelFade + fadeTo(1,0)；stop 后再 play 真重载 | K5 是换曲窗口内回旧曲、'stop fade 窗口内重申同曲'是停止窗口；steady-state（无 inflight）重复的直接合同未证 |
| L3 | setEnabled 同值幂等 | bgm.ts:250-265（`if (on === enabled) return`） | main.ts:325-326 偏好回放（每次 boot 连调） | 同值 setEnabled 连调（开/开、关/关） | 重复开零动作；重复关 pause/cancelFade 恰 1；重开补播 | 旧测只走 false→true 变值路径；接口注释「幂等:无变化不重启」未证 |
| L4 | 播放中替换：旧曲停+新曲就绪 | midi-preview.ts:240-268（load 替换路径双 pause） | 编辑器试听换选（同 transport 合同；MusicTab 消费侧归 EDITOR-AUDIO-OWNERSHIP 卡） | 旧曲播放中 load 新曲（cachedActivity 公开参数） | 双 pause 防护整体（paused=true）、b 字节真入 sequencer、快照 currentTime 0/duration 换新、play 从头且不重载 | C4 A/B 逆序从未先 play；test.ts 只单曲内 pause/seek/stop；「替换时停旧曲」未证 |
| L5 | 替换读取失败不半提交旧字节 | midi-preview.ts:243-251（替换状态重置） | 同上 | failOnce 一次性读取失败（合法失败注入） | 精确拒绝；新曲未入 sequencer；旧曲已停；duration 回退 sequencer 兜底（99≠旧 activity 10 判别）+ play 拒「请等待」；修复后重载开播 | C5 失败轴是全新 transport 首载；替换（旧曲在播）失败后的状态重置轴未证。初版 duration=0 预期被实测推翻，按源码真值修正（见 README） |
| L6 | 首 root 访问后中途 abort | sfx-readiness.ts:131-132（visit 入口 throwIfAborted） | main.ts:669-676 prepareSceneSounds（经 collectScriptSoundAssets seam） | 双 root：root[0] 合法 playSound、root[1] 合法 playEntityAction（缺 spritesById 时 fail-loud 作判别器） | AbortError 收场；同输入不 abort 正控证 root[1] 可达且会以内容错误收场 | collections 卡只证「signal 预取消 → 进入前即拒」；访问进行中的 abort 未证。sfx-readiness 为音频家族唯一真 AbortSignal 输入（bgm/midi 的取消是 DOMException AbortError 语义，旧测已证） |

## 登记未证但不新增（同 caller/同 oracle 或弱判别，按「少而精」）

- **midi-preview dispose 后 play 的精确拒绝**：dispose 清 asset 后 play 命中「请等待 MIDI 读取完成。」
  前置守卫，与 play-guards 已证的 load-after-dispose AbortError 同 dispose 轴同 caller；针只能打
  守卫顺序（错误消息判别），业务面弱，登记不设针。
- **midi-preview 双 dispose**：transport.dispose 无早退，二次调用会再次调 runtime.dispose（浏览器
  runtime 自身幂等）；针打的是实现偶合而非合同，登记不设针。
- **bgm stop 重复调用**：第二次 stop 仍会调 seq.pause（目标态相同）；无可判别业务差异，登记不设针。
- **bgm doPlay 内 ctx.resume 被拒后继续提交**（挂起 ctx 上静默提交）：已作为 L1a 的前置步骤被覆盖
  （静默提交即其断言对象），不单列。

## 判例

- 替换/停止类防护常双守卫（midi-preview load 同步 pause + loadSequencer pause）：单删一处被互补
  吸收不红，针必须打成防护整体失效（N4 双编辑点）。
- 失败态排重判别要防 harness 掩蔽：sequencer 兜底 duration 若与旧 activity 相同，则「旧 activity
  残留」不可判别——兜底取 99 与旧值 10 区分。
- mock sequencer 的 load 不得隐式改 paused（适配器合同面无此保证），否则「替换停旧曲」被 mock
  自身吸收。
- content-review SHA pin 外科刷新（三处同 pin 全局替换 + revision.history 追加 + json.loads 先验后写）
  可复用 0568db299 先例脚本模式；本卡基线 053ae5bb4 的开卡提交自带三文件 pin drift，随卡修复。
