# Wave I 回执 — TEST-GLM-NEW-I-1(一阶段壳层、菜单与呈现)

- 分支 / 工作树:`codex/glm-new-i-r1` @ `/Users/zhangxu/.codex/worktrees/glm-new-i/type-pal`
- 生产冻结:`ced193f4f590c57d25ad2d48e2aa256e4b70a902`;wave I digest 与
  `verify-targets.mjs` 输出一致(`d07621c5…c404`,2026-09-29 实跑通过)。
- **候选完整 SHA(r2 测试与证据提交):`8f71e0f3fd0d366558e7b2dda07a9c2eeb546f57`**
  (详见文末「候选 SHA」节)。
- 新增文件:**9 个**同目录 `<stem>.glm-next-wave.test.ts`(12 个冻结源中 **9 源**有新测试,
  **3 源**登记 existing-proof);证据仅本目录。
- 门禁:定向新测(9 文件 / 40 测试)+ 相邻旧测(15 文件 / 595 测试)全绿(maxWorkers 1);
  `@type-pal/game` typecheck 0 诊断;新增 9 文件 Biome error/warning/info 全零;
  **完整 `pnpm lint` PASS 0/0/0**(2641 files,含本目录全部证据 JSON)。
- 未跑(按卡面禁令):官方 ratchet / 受保护 fast、E2E、合 main、标 done。
- **r2(2026-09-29)按 Codex r1 审核意见返工**(`docs/testing/glm-new-waves/codex-review-I-2534b72c.md`,
  该文件在 main 提交、本分支不含,故不挂本地链接):
  ① 证据 JSON 全部按原规则格式化,完整 `pnpm lint` 清零;② 计数更正 9 文件 / 3
  existing-proof 并写入完整 SHA;③ 作废含 skipped 的旧过滤反控,补一枚不同业务合同的
  严格反控(统一判据含产品 hash 不变);④ showError 记录调用时序,铺底 `#400` 由断言直证;
  ⑤ AVI 异步改 deferred 显式 settle + `vi.waitFor` 条件等待 + `finally` 释放;
  ⑥ 共享 `docs/testing/glm-new-waves/README.md` 恢复只读基点版本。

## 逐组旧证 → 新差异

| 组 | 冻结源 | 旧证(去重依据) | 新差异(本 wave 新增) |
|---|---|---|---|
| I01 | `dev/dev-panel.ts` | `dev-panel.pure.test.ts`(纯函数/apply*)、`dev-panel.test.ts`(BOSS_ROSTER) | **新测** `dev/dev-panel.glm-next-wave.test.ts`(3):B(explore)开 picker + 再按 B 关闭 + 两次 preventDefault;非 explore/battle(event)按 B 不拦截不开面板;F1 console dump = 深拷贝(mutate 原 gs 不影响 dump、非同引用)。未证:`!DEV → return` 假分支 —— vitest 把 `import.meta.env.DEV` 编译期替换,`vi.stubEnv`/env 对象赋值均改不了被测模块视角,生产由 dead-code-elimination 兜底(尝试 stubEnv 与共享 env 翻转均无效,如实登记,不凑绿)。 |
| I01 | `shell/bootstrap.ts` | `bootstrap-load/-audio/-resources.test.ts`(palette 助手 / syncShellAudio / 资源生命周期) | **新测** `shell/bootstrap.glm-next-wave.test.ts`(2):`showError` 有 2D ctx → 按调用时序记录端口值:fillRect 发生时 fillStyle=`#400` 且参数铺满 (0,0,320×200),fillText 发生时 fillStyle=`#f88`、font=`10px monospace` 于 (8,32)(r2:时序记录,铺底色由断言直证,不再只看结束值);无 2D ctx(null)→ 静默不抛。`bootstrap()` 本体全资源编排,vitest 不能合法驱动,登记未证。 |
| I02 | `core/menu/menu-driver.ts` | `menu-driver.test.ts` 38 例经 `tickMenu → dispatchMenuInput` hub 驱动全部 dispatch*;`shop-menu.test.ts` 直驱 hub;`scene-system.test.ts` 大世界快捷键 | existing-proof(零新增)。 |
| I02 | `core/event-opcode-player.ts` | `event-opcode-player.test.ts`(0x18 原位换装/0x1d/0x29/0x8d/0x55·0x56/0x2a no-op)+ `event-system.test.ts`(0x19/0x1a/0x1b/0x22/0x23 全卸/0x2f/0x41 管线) | **新测** `core/event-opcode-player.glm-next-wave.test.ts`(6):0x2b 单体与 applyAll 解指定种毒(异种毒/异 role 保留,全仓此前零覆盖);0x2c 按等级解毒(level≤3 清、level 99 装备伪毒保留);0x21/0x28/0x2e 战斗保留族 no-op(与旧证 0x2a 合成完整家族);0x23 卸指定单槽(slotPlusOne≠0,旧测只证全卸);0x18 非法槽([0x0b,0x10] 之外)警告 + 零变异。 |
| I03 | `present/present.ts` | `present.test.ts`(presentFrame/菜单门控/Y-sort/孤儿自清)、`present-battle.test.ts`(presentBattleFrame)、`framebuffer.test.ts`(toImageData)+ 全部 shell 播放器测试直证 `flushToCanvas` 的 putImageData 消费 | existing-proof(flushToCanvas 为 2 行包装)。 |
| I03 | `present/dialog-box.ts` | `dialog-box.test.ts`(parse/append/tick/confirm/rect/textPos/draw/portrait/key icon)、`event-dialogue-pagination.test.ts`(分页 3.7c) | **新测** `present/dialog-box.glm-next-wave.test.ts`(13):`getDialogTitlePos` 6 行真值表(4 style × 有无头像);`isCharacterNameLine` U+003A/U+FF1A/U+2236 三冒号 + 非结尾/居中/空串(两导出零覆盖);`resetDialogBody` 清正文/计数/typing 态 → line-done 且保留 titleText/portraitIcon/style/fontColor(text.c:1775)。 |
| I04 | `core/scene-system.ts` | `scene-system.test.ts`(2000+ 行:走路/触发/loadScene/碰撞/wScriptOnEnter/明雷)+ `scene-system-search.test.ts` | existing-proof(零新增)。 |
| I04 | `core/menu/magic-script.ts` | `magic-script.test.ts`(0x1B/1C/1D/22 数值、未知 raw skip、scriptId=0、label 缺失、castOverworldMagic) | **新测** `core/menu/magic-script.glm-next-wave.test.ts`(4):goto 自环死循环被 SCRIPT_TICK_LIMIT(256)终止 → false 且 0x1B 恰执行 128 次(HP 50→178,证明真执行非早退);goto 目标 label 缺失 → false 且前序副作用保留;非 raw 具名 op(showDialog)warn skip 不阻流;single-target 0x1B 在 target=0xFFFF 下 no-op 且 success=true(不误报失败扣 MP)。 |
| I05 | `shell/ending-player.ts` | `ending-player.test.ts`(正常 N 帧/beast 缺帧/阻塞 fade 助手) | **新测** `shell/ending-player.glm-next-wave.test.ts`(4):`waitForKey`(bootstrap.ts:1483 真实 caller,零覆盖)默认键表命中 resolve + capture 监听释放、非命中不拦截、自定义键表;`playEndingAnimation` skipKeys 播中拦截 + 提前退出(fake timers 证刷帧数=2 远小于 frameCount=100)+ finally 释放监听;upperIndices 长度≠64000 → 回退全黑(帧值集合断言,对 applyScreenWave 扰动免疫)+ 合法长度对照组无黑。 |
| I05 | `shell/rng-player.ts` | `rng-player.test.ts`(全帧/跳过/缺 chunk/start>end/单帧失败/shake 递减/fadeIn/成功路径并发去重) | **新测** `shell/rng-player.glm-next-wave.test.ts`(2):startFrame/endFrame 窗口 = 实际 fetch 与显示集合(窗外帧零请求,末屏=窗口末帧);chunk 加载失败不长期缓存失败 Promise —— 第二次播放真实重载(loader 恰 2 次调用)并显帧(补旧证只覆盖成功去重的"失败驱逐"半边)。 |
| I06 | `shell/avi-player.ts` | `avi-player.test.ts`(video 创建/三跳过键/非跳过键/error resolve/幂等 cleanup/音量 4 合同) | **新测** `shell/avi-player.glm-next-wave.test.ts`(3,r2 改确定性):play() 被 autoplay policy 拒绝(play 端口替身返回测试受控 deferred,测试**显式 settle** rejection)→ overlay 出现;点击 overlay 真实 MouseEvent 重试(resolved)→ overlay 摘除、视频保留,ended 正常清理;`warmUpVideoAutoplay`(main.ts:52 真实 caller)成功 → 同一 muted 元素 play 后 pause,拒绝 → 静默不抛不 pause。状态断言一律 `vi.waitFor` 条件等待(overlay 出现/摘除、pause 已调、rejection 链已执行),无固定 sleep;用例 `finally` 兜底 settle 未决 deferred。 |
| I06 | `shell/splash-fallback.ts` | `splash-fallback.test.ts`(三跳过键/自定义键表/滚动 blit/L44 早跳过标题补满/L42 淡黑) | **新测** `shell/splash-fallback.glm-next-wave.test.ts`(1):未跳过路径标题每帧 +1 行渐显(fake timers 恰停第 3 帧后:dy=0..2 已画、dy=5 未画;仙鹤帧全透明替换锚定断言;nowFn=Date.now 配 fake Date 使补完渐变+600ms 淡出在 fake 时钟可终止)。 |

合计新增 40 测试 / **9 文件**,全绿(Vitest JSON:`evidence/vitest-new-tests.json`,
tests 40 / passed 40 / failed 0 / success true,exit 0;相邻旧测 15 文件 595 测试同绿)。

## 反控(判据隔离于本目录;针文件取证后即删,不入提交)

统一判据(每一枚 valid 业务针都按同一套核验并留证):对照 exit 0;注入恰 exit 1;
唯一 failed;无混错 / 无 skip / 无零执行;绝对 test file + 完整 fullName;
**产品源 hash 注入前后不变**。混错、skip、timeout、零执行、exit 2 均 invalid。

1. **C1(valid)— rng-player 帧窗口合同**(`evidence/counter1-mixed.json`):临时针
   `src/shell/rng-player.glm-next-wave.counter1.test.ts` 故意把窗口合同写成"fetch 全部 4 帧",
   与真测同批跑 → exit 1,恰 1 failed(针 fullName 绝对命中),同文件对照组与真测 3 例
   passed,**4/4 全执行、零 skip**。
2. **C2(valid,r2 新增,不同业务合同)— magic-script goto 终止合同**
   (`evidence/counter2-needle.json` + `evidence/c2-baseline.json` +
   `evidence/c2-product-before/after.txt`):临时针
   `src/core/menu/magic-script.glm-next-wave.counter2.test.ts` 对该合同做单点变异 ——
   故意断言死循环终止时 `runMagicScriptSync` 返回 `true`(真值为 `false`),文件内仅此一枚
   错误期望。统一判据核验结果 —— 对照:真测文件单跑 exit 0(4/4 passed,零 skip);
   注入:针文件单跑 exit 1,total=1 / failed=1 / statuses={"failed":1},无混错、无 skip、
   无零执行;绝对定位:file `core/menu/magic-script.glm-next-wave.counter2.test.ts`,
   fullName「反控针 C2 — magic-script goto 终止合同(错误期望) goto 自环死循环被
   SCRIPT_TICK_LIMIT 终止(故意断言 true → 必须红)」;产品 hash:`magic-script.ts`
   SHA256 `ed17cafba112e9f2dcbe2f44f7ad7eb4d687fd5cd272271910506c0b08393220`
   注入前后一致,`git status` 无产品改动。
3. **C3(invalid 陷阱演示,不计业务针)**(`evidence/counter-bogus.json`):
   `vitest run <真测文件> -t "Absolutely No Such Test Name"` → **exit 0** 但
   passed=0 / failed=0(2 skipped)。结论:vitest 4 对 `-t` 零匹配报 exit 0,
   裸 exit code 不可作通过依据 —— 此证据只用于证明该陷阱,不算第二枚业务针。
4. **已作废**:r1 的 `counter1-filtered.json`(-t 过滤重跑,JSON 含 1 条 skipped)
   按"含 skip 不得记 valid"删除;C1/C2 现为两枚互不同合同的 valid 业务针
   (rng 窗口 fetch 集合 / goto 终止返回值),均无 skip。

## 视觉:一条开场菜单(菜单-driver 域)隔离功能视觉

- URL `http://localhost:6093/`(6093 空闲端口,`E2E=1` HTTP 旁路,strictPort);
  视口 1440×900;IAB 真实浏览器;未启动新游戏、未走剧情、未重跑 E2E。
- 步骤:加载 → 「可选访问统计」点「拒绝」→ 启动过场至开场菜单
  (新的故事/旧的回忆)→ 截图 A → 点击画布聚焦 + `ArrowDown` → 截图 B。
- 预期/实际:光标高亮(黄)从「新的故事」移到「旧的回忆」——两张图可见选中态互换,实际一致。
  Codex r1 已实际看图复核一致。截图存 `/tmp/type-pal-glm-new-wave/I/`(按卡面路径):
  - `menu-opening-initial.png` SHA256 `eaf678b648bac34481ff9ca0a9cad9cee4aa70564f841b0edc96c51664d553b9`
  - `menu-after-down.png` SHA256 `277774d101a1bb1ab35743d1c693c4eaa072abdc34bb2a246733f001a9f5daaf`
- 运行态探针(页面 evaluate `window.__tpgs`,DEV hook):`devHookPresent=true`,
  `mode='menu'`,`menuStackTop.kind='opening'`,`wNumScene=1` —— 与画面一致。
- **console:浏览器 console 历史未采集,仍为未证项**(不以运行态探针冒充 console 归零;
  页面仅观察无 showError 错误横幅、无报错覆盖层)。
- 本组 I01 的 dev 面板 B 键功能视觉未在浏览器执行(需进入 explore 模式 = 开新局走剧情,
  触碰卡面"不启动正式通关/不重跑 E2E"红线);B/F1 显式控制已由
  `dev/dev-panel.glm-next-wave.test.ts` 单测闭环,如实登记。

## 环境备注 / 白名单声明

- **共享 README 已恢复**(r2):`docs/testing/glm-new-waves/README.md` 回到派发基点
  `2948810f` 版本(删去 r1 的导航行);wave-I 导航由 Codex 接收时补。当前分支
  `pnpm check:docs` FAIL(1) = `docs/testing/glm-new-waves/README.md:1: 子目录未进入导航:
  docs/testing/glm-new-waves/wave-I`,即该条共享导航 issue,由 Codex 承担,GLM 不越界改。
- 本 worktree 缺 gitignored `data/extracted`,已软链到主 checkout
  `/Users/zhangxu/illegal/type-pal/data/extracted`(仅本地环境修复,不随提交);
  `dev-panel.test.ts` 相邻批因此从 ENOENT 文件级失败恢复为绿。
- DOM 2D 替身说明:jsdom 不暴露 `CanvasRenderingContext2D` 全局且原生 ctx 原型带 host
  访问器,替身经 `Object.create(Object.prototype)` 构造,零 `any`/零双强转/零 ts-ignore,
  只实现被测函数声明的端口(fillStyle / font / fillRect / fillText;putImageData);
  `HTMLMediaElement.prototype.play/pause` 替身与旧测同法,r2 起 play 返回测试受控 deferred。

## 候选 SHA

- **r2 候选(本回执所属的测试与证据提交)完整 SHA:
  `8f71e0f3fd0d366558e7b2dda07a9c2eeb546f57`**
  (父提交 = 派发基点后的 r1 候选 `2534b72c49366370e56841c5f2422515f83a7c5c`)。
- 分支 HEAD = 上述提交之上仅多一枚「回执钉 SHA」提交,以最终推送记录为准。

## 待 Codex 独立验收(再审)

- 未证登记:I01 DEV 假分支(编译期替换不可构造);bootstrap() 全量编排(vitest 不可合法驱动);
  浏览器 console 历史(r1 视觉未采集,保持未证,待 Codex 补验或明确保持);
  I02/I03/I04 三个 existing-proof 源(见逐组表)。
- 真实产品缺陷:无(全部测试基于现行行为;未发现需另开卡的隔离红诊断)。
