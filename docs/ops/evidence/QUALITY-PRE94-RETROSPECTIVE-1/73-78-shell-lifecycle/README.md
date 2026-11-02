# CODE73/74/76/77/78 shell 生命周期五卡复审切片(GLM)

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE-QUALITY-73(input)、74(audio)、76(main-loop)、77(rng-player)、78(avi-player)五卡的联合复审切片:基点 dec0626e1c(=合并后 origin/main=origin/codex/code-quality-3y,fetch 核对 0/0);候选 HEAD 12a39b4c9,同一隔离 worktree 三笔提交——50704d25e 注释/锚点/表达修正(零行为)、5d3e98cae audio.test 补强(DM29+L47 两轴,17→20)、12a39b4c9 rng-player leaves 测试头重复 docblock 清理。范围:5 生产文件+11 份卡内测试全文逐文件八维;audio-midi 归 CODE75 不在本片。完整读取清单、SHA 与 primary 锚见 [read-boundaries.json](read-boundaries.json);逐文件 A-H 索引见 [per-file-index.md](per-file-index.md);C3 执行原件与声明矩阵见 [README.md](c3-evidence/README.md)。五卡当时建议 pending→partial(作者审查完成,待 Codex 据证验收)。原件逐字节保全于下方保全块。

## 来源与输入

A 维逐文件:input.ts 全读——suppressedHeld'keyup 前抑制'与 C 真值核清(PAL_ClearKeyState input.c:1188-1206 只清 dwKeyPress;dir 仅在方向 keydown/keyup 从 dwKeyOrder 重算 input.c:236/286),并发现登记一个此前未记录的近似角点:C 在 scene-fade 后任意方向键事件会从 order 表重算复活仍按住的其它方向键,TS 按键各自 keyup 解除、多键同持穿 scene-fade 的'复活'不还原,已写入 DM30 docblock(修正实现即需改输入消费模型,先记录);KeyM→Menu 为已披露 dev 追加。main-loop.ts 全读字节未动,DM31 顺延/结转与 game.c:65-80 一致,未发现直接缺陷。audio.ts 全读,L46 去重/DM29/胜利曲与 sound.c/battle.c 对应段一致,发现两个零覆盖轴。rng-player.ts 全读,shake 透传/跳过结清/in-flight 缓存/失败驱逐与注释一致,DM27'默认不可跳'经 rngplay.c 无 dwKeyPress 检查+main.c:395 属标题屏双重核证。avi-player.ts 全读,跳过键 stopImmediatePropagation 防残留、DL27 500ms(aviplay.c:741-747)、cleanup 幂等核;B 维错误——两处跳过键锚点写 uigame.c:395,真值为 aviplay.c:711(uigame.c:395 实为 PAL_BattleSpeedMenu 区),已修;playsInline 仅 warm-up 设置,iOS 全屏不在支持域登记 N/A。B-H 维:修 6 处错误/过时注释,suppressedHeld 类型简化为 Set<AbstractKey> 并上移,删 rng leaves 一行重复 docblock,注入端口已是模块声明端口无需扩公共 API。

## 断言与业务 oracle

E 维逐例核读 11 份卡内测试,排重头完备。两个真实零覆盖轴已补:其一 DM29 battleIntroActive(audio.ts:100)——用户报障修复分支删掉后此前无任何测试变红,补 pickMusicTrack(true,16,7,true)→0 等三断言,caller 为 bootstrap.ts:194-199 每帧实参;其二 L47 curMusicLoop 还原(audio.ts:312/320)——旧测试全用 loop:true,回退硬编码 true 无判别,补两例:非循环 track 经 setMusicEnabled 开关、经 setMusicBackend 注入,均须以 loop=false 重播。变异反控(隔离 in-place、git checkout 字节恢复、tree-clean 验证)见 [mutation-dm29-branch-removed.json](mutation-dm29-branch-removed.json) 与 [mutation-loop-hardcoded-true.json](mutation-loop-hardcoded-true.json):删 DM29 分支→20 例中恰 1 红,失败身份=新 DM29 例;两处补播硬编码 true→恰 2 红,失败身份=两枚 L47 例。

## 结果

定向基线(改动前)11 files/106 passed exit0;最终(改动后)11 files/109 passed(+3) exit0、零 stderr(原件 [directed-final.json](directed-final.json),numTotalTests=109/numFailedTests=0/numTotalTestSuites=38——该计数含 describe 双计,vitest json 口径);tsc --noEmit(packages/game)0 诊断;biome check 0/0/0。未跑(留阶段收尾,Codex 集中安排):全仓 pnpm check、official coverage ratchet、protected fast、editor 全包。83 卡状态建议:73/74/76/77/78 由 pending→partial(本片);不整卡 accept,统一门未跑。

## 限制与复核

claim 失效条件:bootstrap 对 pickMusicTrack/sync 实参形状变化、audio replay 语义变化、sdlpal 参考库版本变化会使对应 A 维结论待复核;两枚新测试判别力绑 audio.ts:100/312/320 三处行语义。剩余 review/unknown:input 多键复活近似(已登记不修)、KeyM dev 偏差(移除属产品裁决)、rng 更广嵌套乱序(归 MEDIA-LIFECYCLE 卡)、audio-midi 归 CODE75、ReplayInputSource 返回引用非拷贝(消费方只读,N/A 登记)。未重跑任何命令;历史结论保持原时点;候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 6135B / SHA-256 db6d95019a445b31bdf8e247eecc0017788a6085f677ae479bd90554b2cdb965；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE73/74/76/77/78 shell 生命周期五卡复审切片(GLM)

基点 `dec0626e1c`(=合并后 origin/main = origin/codex/code-quality-3y,fetch 核对 0/0);候选 HEAD `12a39b4c9`,同一隔离 worktree 三笔提交:

- `50704d25e` 注释/锚点/表达修正(零行为)
- `5d3e98cae` audio.test 补强(DM29 + L47 两轴,17→20)
- `12a39b4c9` rng-player leaves 测试头重复 docblock 清理

范围:CODE-QUALITY-73(input)、74(audio)、76(main-loop)、77(rng-player)、78(avi-player)五卡的 5 生产文件 + 11 份卡内测试,全文逐文件八维;audio-midi 归 CODE75 不在本片。完整读取清单、SHA 与 primary 锚见 [`read-boundaries.json`](read-boundaries.json)。 逐文件 A–H 索引与读域标注见 [`per-file-index.md`](per-file-index.md)(2026-10-20 C1 返工新增)。C3 执行原件与声明矩阵见 [`c3-evidence/`](c3-evidence/README.md)。五卡当前建议 `pending → partial`(作者审查完成,待 Codex 据证验收;audio.ts/main-loop.ts 等文件的具体行状态建议见下)。

## A 正确性与边界(逐文件)

- **input.ts**:全读。`suppressedHeld`"keyup 前抑制"与 C 真值核清——`PAL_ClearKeyState`(input.c:1188-1206)只清 dwKeyPress;`dir` 仅在方向 keydown/keyup 事件时从 dwKeyOrder 重算(input.c:236/286),PAL_SceneFade/palette.c:313-316、441-446 每步打 Unknown 后,单键场景下 TS 与 C 等价(都须重按)。**发现并登记一个此前未记录的近似角点**:C 在 scene-fade 后任意方向键事件会从 order 表重算复活仍按住的其它方向键;TS 按键各自 keyup 解除,多键同持穿 scene-fade 的"复活"不还原。已写入 input.ts DM30 docblock(修正实现即需改输入消费模型,收益不值,先记录——与既有"fade 窗口点按被丢弃"近似同列)。KeyM→Menu 为已披露 dev 追加(sdlpal 键表无 m,测试现标注)。
- **main-loop.ts**:全读,字节未动。DM31 顺延/结转与 game.c:65-80(`dwTime = SDL_GetTicks() + FRAME_TIME`)一致;DM30 分族边界、present 门控(battleAnim/battleFade)与 caller 一致。未发现直接缺陷。
- **audio.ts**:全读。L46 去重与 sound.c:769-772/930 一致;DM29 序列与 battle.c:715-730 一致;胜利曲 battle.c:1030-1033 一致。**发现两个零覆盖轴**(见 E 维)。
- **rng-player.ts**:全读。shake 透传/跳过结清/in-flight 缓存/失败驱逐与注释声明一致;DM27"默认不可跳"经 rngplay.c 无 dwKeyPress 检查 + main.c:395 属标题屏(非 trademark 路径)双重核证。
- **avi-player.ts**:全读。跳过键 stopImmediatePropagation 防 Space 残留(历史用户报障)、DL27 500ms 延迟(aviplay.c:741-747)、cleanup 幂等/curVideoEl 解跟踪均核。**B 维错误**:两处跳过键锚点写 `uigame.c:395`,真值为 `aviplay.c:711`(uigame.c:395 实为 PAL_BattleSpeedMenu 区);已修。playsInline 仅 warm-up 设置而 playAvi 未设——键盘驱动的桌面向游戏,iOS 全屏行为不在支持域,登记 N/A 不修。

## B/C/D/F/G/H

- B:修 6 处错误/过时注释(avi 锚点×2、rng 过时 PNG×2 与"默认可跳"×1、midi.c:67→69);input DM30 补已核近似。C/D:五文件职责/状态 Owner 清楚(input 持有键序、audio 持播放、main-loop 纯编排、两 player 自持 DOM/缓存),无越层写。F:input.ts `suppressedHeld` 类型从 `Set<ReturnType<typeof codeToAbstractKey> & string>` 简化为 `Set<AbstractKey>` 并上移至 held/pressed 旁。G:删 rng leaves 测试一行重复 docblock。H:注入端口(fetchManifest/fetchFrame/__setRngChunkLoaderForTest)已是模块声明端口,无需扩公共 API。

## E 测试质量(逐例)

11 份卡内测试逐例核读,排重头完备(input.boundaries H02 已判别"只抑制方向键"、main-loop-gates G09-B02 已判别 battleAnim 门控、io/async-lifecycle 相邻轴归 TEST-GAME-MEDIA-LIFECYCLE-1 不重领)。**两个真实零覆盖轴,已补**:

1. **DM29 battleIntroActive**(audio.ts:100):用户报障修复分支,删掉后此前无任何测试变红。补 `pickMusicTrack(true,16,7,true)→0` 等三断言,caller 为 bootstrap.ts:194-199 每帧实参。
2. **L47 curMusicLoop 还原**(audio.ts:312/320):旧测试全用 `loop:true`,回退硬编码 `true` 无判别。补两例:非循环 track 经 setMusicEnabled 开关、经 setMusicBackend 注入,均须以 `loop=false` 重播。

变异反控(隔离 in-place、`git checkout` 字节恢复、tree-clean 验证,原件 [`mutation-dm29-branch-removed.json`](mutation-dm29-branch-removed.json) / [`mutation-loop-hardcoded-true.json`](mutation-loop-hardcoded-true.json)):

- 删 DM29 分支 → 20 例中恰 1 红,失败身份 = 新 DM29 例;
- 两处补播硬编码 true → 恰 2 红,失败身份 = 两枚 L47 例。

## 执行事实

- 定向基线(改动前):11 files / 106 passed,exit 0;最终(改动后):11 files / **109 passed**(+3),exit 0,零 stderr(原件 [`directed-final.json`](directed-final.json),`numTotalTests=109/numFailedTests=0/numTotalTestSuites=38`——该计数含 describe 双计,vitest json 口径)。
- `tsc --noEmit`(packages/game):0 诊断。
- biome check(audio.test.ts 与全部改动文件):0/0/0。
- **未跑**(留阶段收尾,Codex 集中安排):全仓 `pnpm check`、official coverage ratchet、protected fast、editor 全包。本片仅 docs 工具随证据提交实跑(check:docs 结果见提交时点回执)。
- 环境:macOS darwin 24.6.0 arm64;worktree `~/.glm-worktrees/pre94-foundation`(detached @ `12a39b4c9`);vitest 经根 `node_modules/.bin/vitest`;cwd `packages/game`。

## 失效条件与剩余项

- claim 失效条件:bootstrap 对 pickMusicTrack/sync 的实参形状变化、audio replay 语义变化、sdlpal 参考库版本变化会使对应 A 维结论待复核;两枚新测试的判别力绑 `audio.ts:100/312/320` 三处行语义。
- 剩余 review/unknown:input 多键复活近似(已登记,不修);KeyM dev 偏差(已披露,移除属产品裁决);rng 未知更广嵌套乱序(归 MEDIA-LIFECYCLE 卡);audio-midi.ts 归 CODE75;`ReplayInputSource` 返回快照为引用非拷贝(消费方只读,无变异证据,N/A 登记)。
- 83 卡状态建议:73/74/76/77/78 由 pending → partial(本片);不整卡 accept,统一门未跑。
```
<!-- incremental-original-source:end -->
