# Wave G 回执 — Reforge 战斗与场景宿主边界（TEST-GLM-NEW-G-1）

候选：分支 `codex/glm-new-g-r1`（本回执所在提交即候选，Codex 验收以推送的完整 SHA 为准）。
工作树 `/Users/zhangxu/.codex/worktrees/glm-new-g/type-pal`；生产冻结 `ced193f4f590c57d25ad2d48e2aa256e4b70a902`
（`verify-targets.mjs` 开工实测通过，Wave G 源 digest `993ee48d…da6005f` 与卡面一致）。

## 交付物

- 12 个新测文件（每冻结源恰一个同目录 `*.glm-next-wave.test.ts`），47 测试全部 passed：
  [vitest-results.json](vitest-results.json)（新鲜 file/fullName/status 全量 JSON）。
- 反控 4 枚：[needle-judge.mjs](needle-judge.mjs) → [needle-verdicts.json](needle-verdicts.json)，全部 valid
  （对照 exit0+目标 passed；注入后恰 exit1+恰目标 fullName 一条 failed+被改产品源 SHA256 前后一致）。
- 隔离 battle trial 视觉：[browser-host/](browser-host/)（vite 6092 + 真实 `runBattleTrial` +
  真实 pal 工程 `httpSource('/projects/pal')` + Playwright chrome）→ 4 张截图
  （/tmp/type-pal-glm-new-wave/G/）+ [visual-evidence.json](visual-evidence.json)（URL/视口/步骤/SHA256/console）。
- 4 张截图均已实际看图初审通过（非“未证”）。

## 逐组旧证 → 新差异

| 组 | 源 | 旧证（已核完整 title 清单） | 本 wave 新增公开合同臂 |
|---|---|---|---|
| G01 | battle-session.ts | battle-session.test.ts + 6 个 *.flows + battle-host.test.ts | 构造边界 playerBaseDefinitionIds 长度守卫(:373)；done 兑现后 cancel() 幂等不扰(:538-539)；defeat 终局后 rewards/moneyDelta/collectGained/hiddenCounts/enemySlotDefs 公开读出 |
| G01 | battle-core.ts | battle-core.test.ts ~100 题 + casualty/enemy-confused | enemySlots >5 上限守卫(:324)；runBattleToEnd maxSteps fail-loud(:2742)；applyEnemyEffect transform 缺目标定义门(:992-994)；divide 唯一活敌 hp≤1 门(:1002) |
| G02 | battle-command-selection.ts | battle-command-selection.test.ts/.residual + W1 会话流 | 技能网格竖向 ±3 钳制(:246-247)；主菜单 E 直进 item 后 Escape 落 miscSub(:279)；队友目标 Escape 按 pendingItemId 退回 item(:324-333)；零活敌目标阶段 confirm/Esc no-op 零提交(:352-353) |
| G02 | battle-trial-host.ts | **全仓零旧测**（仅 config/prepare/assets 数据层有旧证） | 无 #screen 画布入口 fail-loud(:31-33)；F5/F9 拦截只更新状态(:116-130)；真实战斗→victory + onResult(胜利) + 状态栏金钱/体力摘要(:285-300)；停止→abort→真实会话取消→promise 兑现 + restart 依外层 signal 复位 + onRestart 回调(:140-166)；onRestart 抛错回显(:156-162) |
| G03 | assets.ts | assets.test.ts + battle-bg/presentation residual | loadStandardPalette 结构守卫四臂(:63-77)；loadTilesetAsset mediaType/bytes/sha 三门(:105-113)；decodeWorldSpriteAssetBytes kind 臂 + 合法 sha 非 gzip 臂(:155-165)；SpriteAssetCache.get 签名漂移逐出(:246-249)；decompressGzip 缺 DecompressionStream 端口(:597-599) |
| G03 | render.ts | render.test.ts（仅 renderScene 遮挡/层序） | spriteBlitRect +7 资产落底(:110-115)；bakeFrame colorShift 上/下钳制 + alpha 映射(:46-57)；clear() 整幅黑底(:370-374)；drawSprite 相机取整 blit(:471-486) |
| G04 | entity-motion.ts | entity-motion.test.ts 四 describe（duplicate/stale/时长=4 已证） | 非安全整数 tick(:1041)；quantum/epoch 非法(:422-425)；intent/side-stick 缺 actor 引用(:419/:441)；side-stick 时长 <1（≥4 旧证）(:444-449)；MotionFairnessClock 批记账/离场剪除/clear 复位(:123-147) |
| G04 | world-scene-presentation.ts | world-scene-presentation.test.ts/.residual | 震屏偶数拍 +level 臂(:263)；shake(now,0) 显式清场(:108-110)；hasEntityFrame/clearEntityFrame/clearEntityFrames 注册表尾经 sprites() 帧选择互证(:88-106)；extraFollowerSpriteIds 稀疏空洞 fail-loud(:226) |
| G05 | debug-tools.ts | debug-tools 7 文件 | 控制台输入 keydown stopPropagation 隔离(:1355)；hidePanel blur 面板内焦点 + Backquote 重开恢复 tab 焦点(:375-386)；presentationBusy 时控制台 scene 命令 confirm 门拒绝/确认两臂(:1183-1185)（旧证只覆盖触发器按钮路径） |
| G05 | magic-menu-state.ts | magic-menu-state 3 文件 | curePoison 缺 curesTier 的 `?? 'common'` 缺省臂两向(:207)：解 common 毒扣 MP / severe 毒保留不扣 MP；单人队 magicMoveCaster 返回新对象值不变(:68-78)（旧证只有空队同引用） |
| G06 | menu-session.ts | menu-session.test.ts 15 题 | 装备面板会话接线 list→pick-role→equipApply→replaceWorld(:281-292)；magic pick-caster Esc 关面板(:234-238)；allAllies 技能会话直放写回全队(:269-273)；status 底部越界/Esc 关面板(:354-358)；覆盖确认中 refreshSaveBrowser 重建丢确认(:154-156)；open() 活动中重入重置回 hub(:147-149) |
| G06 | screen-fx.ts | screen-fx.test.ts/.residual（0<shift<w 与 shift=0 已证） | shift ≥ w 整行复制 else 臂(:73-79)；缓存画布尺寸首次烘焙冻结(:61-65)；同 srcTag/amp/phase 换 src 命中陈旧缓存(:59-60) |

## 反控（判据只写本目录）

| 针 | 注入点 | 注入 | 目标测试 | 裁决 |
|---|---|---|---|---|
| G-N1 | battle-session.ts:373 | 长度守卫条件置 false | G01 构造边界守卫题 | control exit0/passed；injected exit1/恰 1 failed；还原 SHA 一致 → valid |
| G-N2 | screen-fx.ts:73 | `shift < w` 条件删除 | G06 shift≥w else 臂题 | 同型 → valid |
| G-N3 | battle-trial-host.ts:33 | 画布守卫消息漂移 | G02 画布 fail-loud 题 | 同型 → valid |
| G-N4 | magic-menu-state.ts:207 | 缺省 tier `common→severe` | G05 severe 毒保留臂（common 解毒臂不受影响，证明针尖精确） | 同型 → valid |

## 视觉（实际看图，非未证）

- URL `http://localhost:6092/`，视口 1440×900，Chrome headless（channel=chrome）。
- trial-menu.png：真实 pal 工程试打面板（三按钮、restart 运行中禁用、状态“战斗中…”）+ 真实战斗渲染
  （李逍遥、双敌、战斗四图标主菜单、头像/150/150 体力、100/100 真气）。
- trial-f5-notice.png：F5 拦截为存读档提示，战斗帧不受扰。
- trial-stop-recovered.png：停止→“已停止。本场变化已丢弃，可重新试打。”、`runBattleTrial settled`、
  停止禁用/重新试打解锁（按钮态互换），rAF 停帧。
- trial-restart-error.png：停止后点击重新试打，宿主注入的 onRestart 抛错消息原样回显状态栏。
- console 仅 vite 连接 debug 与 `.type-pal/save-state.json` 的 9 条 404 资源日志（无存档文件的预期路径，
  `readProjectSaveState` 按 NotFound=无档处理），零 pageerror。

## 门禁记录

- 定向新测 47/47 passed（maxWorkers 1）；相邻旧测回归 36 文件 489/489 passed（同源全部相邻文件）。
- `packages/reforge` typecheck 零错误；12 个新增文件 Biome error/warning/info 全零（--write 归位后复核）。
- `git status`：仅本 wave 白名单内新文件（12 测试 + wave-G 证据 + browser-host）；产品/旧测/共享配置零 diff；
  反控注入后产品源逐一还原（SHA256 前后一致记录于 needle-verdicts.json）。
- 未跑：全仓 check、官方 ratchet、受保护 fast、E2E（按卡面禁项）。

## 未证 / 判 unreachable 登记（不改预期凑绿）

- battle-command-selection.ts 的 `战斗技能列表为空`/`战斗物品游标越界`/`战斗投掷物游标越界`/`缺 throw 能力`
  四个 throw：唯一生产调用方 battle-session 自身过滤（:580-585 checkThrowSpec、mainActionValidity 空表门），
  类级触发只能靠喂调用方永不产出的 context → 判 defensive-unreachable，不以非法 fixture 命中。
- battle-session.ts `revivePartyAll` 编排臂（:877-882）：需 encounter choreography 驱动，属剧情/演出 E2E 域
  （本 wave 红线禁主场景路线）→ 未证登记，留 E2E 批次。
- battle-core.ts `decideEnemyAction` transform/summon 缺数据 log-fallback（:885-901）：cast 臂有旧证；该两臂需
  AI 抽签驱动 fixture，收益低 → 未证登记（非合同缺失）。
- magic-menu-state.ts revive `hpPercent: 0`（:195）：0% 复活仍记 success 并扣 MP 疑似真实产品取舍点，
  按卡面“真产品 bug 交 Codex 另卡”不固化进测试，登记待 Codex 裁决。
- world-scene-presentation.ts wave 画布随宿主 canvas 重同步（:309-314）：需波动路径+宿主 resize 双轴，
  属演出视觉域 → 未证登记。
- debug-tools.ts 战斗 tab 激活重渲染（:1108-1116）：交互矩阵大且逻辑已被 partyList change 路径旧证覆盖 → 未证登记。

## 真产品红项

未发现：所有实测臂行为与源码读取一致，无隔离红诊断需要另卡。
