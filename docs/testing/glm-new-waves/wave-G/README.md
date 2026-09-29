# Wave G 回执 v2 — Reforge 战斗与场景宿主边界（TEST-GLM-NEW-G-1 rework）

Codex 后续已对原回执未归因的 console 补做[URL 级验收](../codex-G-console-closure-20260929.md)；
下文 r2 `console 未证` 是当时原始结果，未追溯改写。

候选：分支 `codex/glm-new-g-r1`（本回执所在提交即返工候选，Codex 验收以推送的完整 SHA 为准）。
r1 候选 `07140f7596798c7687322eba83b110fcec0d033a`；本次按 main 上
`docs/testing/glm-new-waves/codex-review-G-07140f75.md`（2026-09-29，rework）六项逐条返工。
生产冻结 `ced193f4f590c57d25ad2d48e2aa256e4b70a902` 未动；共享
`docs/testing/glm-new-waves/README.md` 已恢复派发原文（r1 的一行导航已撤销，索引归 Codex 集成时处理）。

## r1 → r2 返工对照

| 审查项 | 返工 |
|---|---|
| 1. 完整 lint 7 errors | 修复：browser-host/{drive.mjs,main.ts} import 排序+格式、needle-judge.mjs 格式、两份 JSON 格式；完整 `pnpm lint` 现 PASS（2647 文件 0/0/0）。 |
| 2. 三处 `as unknown as` | render.glm-next-wave.test.ts ×2、world-scene-presentation.glm-next-wave.test.ts ×1 全部移除；改为 `Partial<Omit<CanvasRenderingContext2D,'canvas'>> & { canvas: {width;height} }` 单次窄化（dom-host.ts:70-113 已收口同型），无第二层强转、无规则排除。 |
| 3. needle 写生产源 | 判据 v2 重写（[needle-judge.mjs](needle-judge.mjs)）：一次性 vitest 配置 pre-load 插件对精确目标模块返回**内存突变源**（loader 注入），磁盘生产文件零写入（r1 的 writeFileSync→还原路径删除）；整文件执行（无 `-t`，零 skipped）；判据同时核基线 exit0+目标 passed、注入恰 exit1+唯一 failed、**绝对 file + fullName 全等**、执行数===文件总数>0、零 skipped/todo、目标源 SHA256 注入前后一致、运行前后 `git status --porcelain` 逐字一致；tmp 目录用后即删、JSON 输出一次性路径。**反例自测 10 组**（基线红/exit0/exit2/双红/错 fullName/错文件/skipped/零执行/hash 漂移/好例）全部按预期拒绝/通过（[needle-verdicts.json](needle-verdicts.json).selfTest）。四针重跑全 valid：执行总数 4/1/4/3，worktreeClean 全真。 |
| 4. screen-fx 陈旧缓存两例 | 已移除「同 srcTag 换 src 返回旧缓存」「同缓存实例改 w/h 保留旧尺寸」两例（无现行调用锚；生产唯一调用方 battle-session.ts:2299-2322 固定 320×200 + srcTag 表背景身份），登记未证（见下）；保留 shift 轴臂（shift≥w 整行复制 else + 0<shift<w 两段卷行对照）。文件头注明裁定来源，不回补。 |
| 5. 视觉 404 归因 | [browser-host/drive.mjs](browser-host/drive.mjs) 现逐条记录 ≥400 响应与 requestfailed 的 **URL/status**：本轮 8 条失败请求全部为 `/projects/pal/.type-pal/save-state.json` 404 = `readProjectSaveState`（project-save-state.ts:17-22 NotFound→null=无存档档位）的预期探测，unattributed 0。console error 9 行与失败请求 8 条**差 1 且文本无 URL 无法逐条归因** → 按审查要求 **console 标未证**（`consoleAttested:false`，见 [visual-evidence.json](visual-evidence.json).failedRequestAttribution）。 |
| 6. 共享 README | 已恢复（git checkout 2948810f --），本候选零共享文件改动。 |

## 交付物

- 12 个 `*.glm-next-wave.test.ts`（每冻结源恰一个），**45 测试全部 passed**：
  [vitest-results.json](vitest-results.json)（新鲜 file/fullName/status；r2 少 2 测 = 审查裁定移除的 screen-fx 两例）。
- 反控 4 枚 valid + 自测 10 组：[needle-judge.mjs](needle-judge.mjs) → [needle-verdicts.json](needle-verdicts.json)。
- 隔离 battle trial 视觉：[browser-host/](browser-host/)（vite 6092 + 真实 `runBattleTrial` +
  真实 pal 工程 `httpSource('/projects/pal')` + Playwright chrome）→ 4 张截图
  （/tmp/type-pal-glm-new-wave/G/，均实际看图初审通过）+ [visual-evidence.json](visual-evidence.json)
  （URL/视口/步骤/SHA256/失败请求归因/console）。

## 逐组旧证 → 新差异（r2 生效版）

| 组 | 源 | 旧证（已核完整 title 清单） | 本 wave 新增公开合同臂 |
|---|---|---|---|
| G01 | battle-session.ts | battle-session.test.ts + 6 个 *.flows + battle-host.test.ts | 构造边界 playerBaseDefinitionIds 长度守卫(:373)；done 兑现后 cancel() 幂等不扰(:538-539)；defeat 终局后 rewards/moneyDelta/collectGained/hiddenCounts/enemySlotDefs 公开读出 |
| G01 | battle-core.ts | battle-core.test.ts ~100 题 + casualty/enemy-confused | enemySlots >5 上限守卫(:324)；runBattleToEnd maxSteps fail-loud(:2742)；applyEnemyEffect transform 缺目标定义门(:992-994)；divide 唯一活敌 hp≤1 门(:1002) |
| G02 | battle-command-selection.ts | battle-command-selection.test.ts/.residual + W1 会话流 | 技能网格竖向 ±3 钳制(:246-247)；主菜单 E 直进 item 后 Escape 落 miscSub(:279)；队友目标 Escape 按 pendingItemId 退回 item(:324-333)；零活敌目标阶段 confirm/Esc no-op 零提交(:352-353) |
| G02 | battle-trial-host.ts | **全仓零旧测**（仅 config/prepare/assets 数据层有旧证） | 无 #screen 画布入口 fail-loud(:31-33)；F5/F9 拦截只更新状态(:116-130)；真实战斗→victory + onResult(胜利) + 状态栏金钱/体力摘要(:285-300)；停止→abort→真实会话取消→promise 兑现 + restart 依外层 signal 复位 + onRestart 回调(:140-166)；onRestart 抛错回显(:156-162) |
| G03 | assets.ts | assets.test.ts + battle-bg/presentation residual | loadStandardPalette 结构守卫四臂(:63-77)；loadTilesetAsset mediaType/bytes/sha 三门(:105-113)；decodeWorldSpriteAssetBytes kind 臂 + 合法 sha 非 gzip 臂(:155-165)；SpriteAssetCache.get 签名漂移逐出(:246-249)；decompressGzip 缺 DecompressionStream 端口(:597-599) |
| G03 | render.ts | render.test.ts（仅 renderScene 遮挡/层序） | spriteBlitRect +7 资产落底(:110-115)；bakeFrame colorShift 上/下钳制 + alpha 映射(:46-57)；clear() 整幅黑底(:370-374)；drawSprite 相机取整 blit(:471-486) |
| G04 | entity-motion.ts | entity-motion.test.ts 四 describe（duplicate/stale/时长=4 已证） | 非安全整数 tick(:1041)；quantum/epoch 非法(:422-425)；intent/side-stick 缺 actor 引用(:419/:441)；side-stick 时长 <1（≥4 旧证）(:444-449)；MotionFairnessClock 批记账/离场剪除/clear 复位(:123-147) |
| G04 | world-scene-presentation.ts | world-scene-presentation.test.ts/.residual | 震屏偶数拍 +level 臂(:263)；shake(now,0) 显式清场(:108-110)；hasEntityFrame/entityFrame/clearEntityFrame/clearEntityFrames 注册表尾经 sprites() 帧选择互证(:88-106)；extraFollowerSpriteIds 稀疏空洞 fail-loud(:226) |
| G05 | debug-tools.ts | debug-tools 7 文件 | 控制台输入 keydown stopPropagation 隔离(:1355)；hidePanel blur 面板内焦点 + Backquote 重开恢复 tab 焦点(:375-386)；presentationBusy 时控制台 scene 命令 confirm 门拒绝/确认两臂(:1183-1185)（旧证只覆盖触发器按钮路径） |
| G05 | magic-menu-state.ts | magic-menu-state 3 文件 | curePoison 缺 curesTier 的 `?? 'common'` 缺省臂两向(:207)：解 common 毒扣 MP / severe 毒保留不扣 MP；单人队 magicMoveCaster 返回新对象值不变(:68-78)（旧证只有空队同引用） |
| G06 | menu-session.ts | menu-session.test.ts 15 题 | 装备面板会话接线 list→pick-role→equipApply→replaceWorld(:281-292)；magic pick-caster Esc 关面板(:234-238)；allAllies 技能会话直放写回全队(:269-273)；status 底部越界/Esc 关面板(:354-358)；覆盖确认中 refreshSaveBrowser 重建丢确认(:154-156)；open() 活动中重入重置回 hub(:147-149) |
| G06 | screen-fx.ts | screen-fx.test.ts/.residual（0<shift<w、shift=0、关闭态已证） | shift ≥ w 整行复制 else 臂 + 同文件两段卷行对照(:73-79) |

## 反控（判据只写本目录；loader 注入不碰生产源）

| 针 | 注入点（内存突变） | 注入 | 目标测试（整文件执行） | 裁决 |
|---|---|---|---|---|
| G-N1 | battle-session.ts:373 长度守卫条件置 false | battle-session.ts | 构造边界守卫题（文件 4 测全跑） | valid（执行 4、唯一 failed、绝对 file/fullName、零 skip、产品 SHA 不变、工作树零残留） |
| G-N2 | screen-fx.ts:73 `shift < w` 条件删除 | screen-fx.ts | shift≥w else 臂题（文件 1 测全跑） | valid（同型） |
| G-N3 | battle-trial-host.ts:33 守卫消息漂移 | battle-trial-host.ts | 画布 fail-loud 题（文件 4 测全跑） | valid（同型） |
| G-N4 | magic-menu-state.ts:207 缺省 tier common→severe | magic-menu-state.ts | severe 毒保留臂（文件 3 测全跑；common 解毒臂不受影响，针尖精确） | valid（同型） |

自测：同一判据函数对 10 组构造场景（含基线红/exit0/exit2/双红/错 fullName/错文件/skipped/零执行/hash 漂移）
逐项按预期拒绝，好例通过（needle-verdicts.json.selfTest，10/10 ok）。

## 视觉（截图实看；console 按审查口径标未证）

- URL `http://localhost:6092/`，视口 1440×900，Chrome headless（channel=chrome）。
- trial-menu.png：真实 pal 工程试打面板（三按钮、restart 运行中禁用、状态“战斗中…”）+ 真实战斗渲染。
- trial-f5-notice.png：F5 拦截为存读档提示，战斗帧不受扰。
- trial-stop-recovered.png：停止→“已停止。本场变化已丢弃，可重新试打。”、`runBattleTrial settled`、
  停止禁用/重新试打解锁，rAF 停帧。
- trial-restart-error.png：停止后点击重新试打，宿主注入 onRestart 抛错消息原样回显状态栏。
- **console 未证**：失败请求侧 8/8 全量归因（save-state.json 404 = `readProjectSaveState` 预期 NotFound），
  但 console error 行数 9 与失败请求数 8 差 1、文本无 URL 无法逐条归因 →
  `consoleAttested:false`（visual-evidence.json.failedRequestAttribution）。零 pageerror。

## 门禁记录（r2）

- 定向新测 45/45 passed（maxWorkers 1）；相邻旧测回归 36 文件 489/489 passed（同源全部相邻文件）。
- `packages/reforge` typecheck 零错误；完整 `pnpm lint` PASS（2647 文件 0 errors / 0 warnings / 0 infos）。
- `git status`：仅本 wave 白名单内文件（12 新测 + wave-G 证据 + browser-host）；产品/旧测/共享配置/基线零 diff
  （needle 全程 loader 注入零写盘，运行前后工作树快照逐字一致）。
- 未跑：全仓 check、官方 ratchet、受保护 fast、E2E（按卡面禁项）。
- 已知 docs check 事项：wave-G 子目录导航按审查指示由 Codex 集成时加入共享 README；
  本候选 `pnpm check:docs` 预期仅报该 1 项（`子目录未进入导航：docs/testing/glm-new-waves/wave-G`），
  其余 0 issues。

## 未证 / 判 unreachable 登记（不改预期凑绿）

- battle-command-selection.ts 的 `战斗技能列表为空`/`战斗物品游标越界`/`战斗投掷物游标越界`/`缺 throw 能力`
  四个 throw：唯一生产调用方 battle-session 自身过滤（:580-585 checkThrowSpec、mainActionValidity 空表门），
  类级触发只能靠喂调用方永不产出的 context → 判 defensive-unreachable，不以非法 fixture 命中。
- battle-session.ts `revivePartyAll` 编排臂（:877-882）：需 encounter choreography 驱动，属剧情/演出 E2E 域
  （本 wave 红线禁主场景路线）→ 未证登记，留 E2E 批次。
- battle-core.ts `decideEnemyAction` transform/summon 缺数据 log-fallback（:885-901）：cast 臂有旧证；该两臂需
  AI 抽签驱动 fixture，收益低 → 未证登记（非合同缺失）。
- **screen-fx.ts WavedBgCache 缓存身份两臂（r2 新增登记）**：「同 srcTag 换 src 返回旧缓存」与「缓存画布尺寸
  首烘冻结、忽略后续 w/h」——生产唯一调用方 battle-session.ts:2299-2322 固定 320×200、srcTag 仅表背景身份，
  两输入无现行消费者证据，旧缓存行为可能是缺陷而非期望合同；r1 曾误钉为正合同，已按审查移除，留 Codex/后续
  裁决后再补。
- magic-menu-state.ts revive `hpPercent: 0`（:195）：0% 复活仍记 success 并扣 MP 疑似真实产品取舍点，
  按卡面“真产品 bug 交 Codex 另卡”不固化进测试，登记待 Codex 裁决。
- world-scene-presentation.ts wave 画布随宿主 canvas 重同步（:309-314）：需波动路径+宿主 resize 双轴，
  属演出视觉域 → 未证登记。
- debug-tools.ts 战斗 tab 激活重渲染（:1108-1116）：交互矩阵大且逻辑已被 partyList change 路径旧证覆盖 → 未证登记。

## 真产品红项

未发现：所有实测臂行为与源码读取一致，无隔离红诊断需要另卡。
