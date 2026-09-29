# Wave I 回执 — TEST-GLM-NEW-I-1（一阶段壳层、菜单与呈现）

- 分支 / 工作树:`codex/glm-new-i-r1` @ `/Users/zhangxu/.codex/worktrees/glm-new-i/type-pal`
- 生产冻结:`ced193f4f590c57d25ad2d48e2aa256e4b70a902`;wave I digest 与
  `verify-targets.mjs` 输出一致(`d07621c5…c404`,2026-09-29 实跑通过)。
- 新增文件:8 个同目录 `<stem>.glm-next-wave.test.ts`(12 冻结源中 8 源有新测试,
  4 源登记 existing-proof / 未证,见下表),证据仅本目录。
- 门禁:定向新测 + 相邻旧测(maxWorkers 1)全绿;`@type-pal/game` typecheck 0 诊断;
  新增 9 文件 Biome error/warning/info 全零(`biome check` exit 0);`pnpm check:docs` PASS
  (758 md / 4033 links / 0 issues)。
- 未跑(按卡面禁令):全仓 check、官方 ratchet / 受保护 fast、E2E、合 main、标 done。

## 逐组旧证 → 新差异

| 组 | 冻结源 | 旧证(去重依据) | 新差异(本 wave 新增) |
|---|---|---|---|
| I01 | `dev/dev-panel.ts` | `dev-panel.pure.test.ts`(纯函数/apply*)、`dev-panel.test.ts`(BOSS_ROSTER) | **新测** `dev/dev-panel.glm-next-wave.test.ts`(3):B(explore)开 picker + 再按 B 关闭 + 两次 preventDefault;非 explore/battle(event)按 B 不拦截不开面板;F1 console dump = 深拷贝(mutate 原 gs 不影响 dump、非同引用)。未证:`!DEV → return` 假分支 —— vitest 把 `import.meta.env.DEV` 编译期替换,`vi.stubEnv`/env 对象赋值均改不了被测模块视角,生产由 dead-code-elimination 兜底(尝试 stubEnv 与共享 env 翻转均无效,如实登记,不凑绿)。 |
| I01 | `shell/bootstrap.ts` | `bootstrap-load/-audio/-resources.test.ts`(palette 助手 / syncShellAudio / 资源生命周期) | **新测** `shell/bootstrap.glm-next-wave.test.ts`(2):`showError` 有 2D ctx → `#400` 铺满 + `#f88` monospace 10px 于 (8,32) 画失败信息(recording 替身只证 fillStyle/font/fillRect/fillText 四端口);无 2D ctx(null)→ 静默不抛。`bootstrap()` 本体全资源编排,vitest 不能合法驱动,登记未证。 |
| I02 | `core/menu/menu-driver.ts` | `menu-driver.test.ts` 38 例经 `tickMenu → dispatchMenuInput` hub 驱动全部 dispatch*;`shop-menu.test.ts` 直驱 hub;`scene-system.test.ts` 大世界快捷键 | existing-proof(零新增)。 |
| I02 | `core/event-opcode-player.ts` | `event-opcode-player.test.ts`(0x18 原位换装/0x1d/0x29/0x8d/0x55·0x56/0x2a no-op)+ `event-system.test.ts`(0x19/0x1a/0x1b/0x22/0x23 全卸/0x2f/0x41 管线) | **新测** `core/event-opcode-player.glm-next-wave.test.ts`(6):0x2b 单体与 applyAll 解指定种毒(异种毒/异 role 保留,全仓此前零覆盖);0x2c 按等级解毒(level≤3 清、level 99 装备伪毒保留);0x21/0x28/0x2e 战斗保留族 no-op(与旧证 0x2a 合成完整家族);0x23 卸指定单槽(slotPlusOne≠0,旧测只证全卸);0x18 非法槽([0x0b,0x10] 之外)警告 + 零变异。 |
| I03 | `present/present.ts` | `present.test.ts`(presentFrame/菜单门控/Y-sort/孤儿自清/1671 行)、`present-battle.test.ts`(presentBattleFrame)、`framebuffer.test.ts`(toImageData)+ 全部 shell 播放器测试直证 `flushToCanvas` 的 putImageData 消费 | existing-proof(flushToCanvas 为 2 行包装)。 |
| I03 | `present/dialog-box.ts` | `dialog-box.test.ts`(parse/append/tick/confirm/rect/textPos/draw/portrait/key icon)、`event-dialogue-pagination.test.ts`(分页 3.7c) | **新测** `present/dialog-box.glm-next-wave.test.ts`(13):`getDialogTitlePos` 6 行真值表(4 style × 有无头像);`isCharacterNameLine` U+003A/U+FF1A/U+2236 三冒号 + 非结尾/居中/空串(两导出零覆盖);`resetDialogBody` 清正文/计数/typing 态 → line-done 且保留 titleText/portraitIcon/style/fontColor(text.c:1775)。 |
| I04 | `core/scene-system.ts` | `scene-system.test.ts`(2000+ 行:走路/触发/loadScene/碰撞/wScriptOnEnter/明雷)+ `scene-system-search.test.ts` | existing-proof(零新增)。 |
| I04 | `core/menu/magic-script.ts` | `magic-script.test.ts`(0x1B/1C/1D/22 数值、未知 raw skip、scriptId=0、label 缺失、castOverworldMagic) | **新测** `core/menu/magic-script.glm-next-wave.test.ts`(4):goto 自环死循环被 SCRIPT_TICK_LIMIT(256)终止 → false 且 0x1B 恰执行 128 次(HP 50→178,证明真执行非早退);goto 目标 label 缺失 → false 且前序副作用保留;非 raw 具名 op(showDialog)warn skip 不阻流;single-target 0x1B 在 target=0xFFFF 下 no-op 且 success=true(不误报失败扣 MP)。 |
| I05 | `shell/ending-player.ts` | `ending-player.test.ts`(正常 N 帧/beast 缺帧/阻塞 fade 助手) | **新测** `shell/ending-player.glm-next-wave.test.ts`(4):`waitForKey`(bootstrap.ts:1483 真实 caller,零覆盖)默认键表命中 resolve + capture 监听释放、非命中不拦截、自定义键表;`playEndingAnimation` skipKeys 播中拦截 + 提前退出(fake timers 证刷帧数=2 远小于 frameCount=100)+ finally 释放监听;upperIndices 长度≠64000 → 回退全黑(帧值集合断言,对 applyScreenWave 扰动免疫)+ 合法长度对照组无黑。 |
| I05 | `shell/rng-player.ts` | `rng-player.test.ts`(全帧/跳过/缺 chunk/start>end/单帧失败/shake 递减/fadeIn/成功路径并发去重) | **新测** `shell/rng-player.glm-next-wave.test.ts`(2):startFrame/endFrame 窗口 = 实际 fetch 与显示集合(窗外帧零请求,末屏=窗口末帧);chunk 加载失败不长期缓存失败 Promise —— 第二次播放真实重载(loader 恰 2 次调用)并显帧(补旧证只覆盖成功去重的"失败驱逐"半边)。 |
| I06 | `shell/avi-player.ts` | `avi-player.test.ts`(video 创建/三跳过键/非跳过键/error resolve/幂等 cleanup/音量 4 合同) | **新测** `shell/avi-player.glm-next-wave.test.ts`(3):play() 被 autoplay policy 拒绝 → 「点击屏幕开始」overlay;点击 overlay 真实 MouseEvent 重试成功 → overlay 摘除、视频保留,ended 正常清理;`warmUpVideoAutoplay`(main.ts:52 真实 caller,零覆盖)成功 → 同一 muted 元素 play 后 pause,拒绝 → 静默不抛不 pause。 |
| I06 | `shell/splash-fallback.ts` | `splash-fallback.test.ts`(三跳过键/自定义键表/滚动 blit/L44 早跳过标题补满/L42 淡黑) | **新测** `shell/splash-fallback.glm-next-wave.test.ts`(1):未跳过路径标题每帧 +1 行渐显(fake timers 恰停第 3 帧后:dy=0..2 已画、dy=5 未画;仙鹤帧全透明替换锚定断言;nowFn=Date.now 配 fake Date 使补完渐变+600ms 淡出在 fake 时钟可终止)。 |

合计新增 40 测试 / 8 文件,全绿(Vitest JSON:`evidence/vitest-new-tests.json`,
files 27 suites / tests 40 / passed 40 / failed 0 / success true,exit 0)。

## 反控(判据隔离于本目录;针文件取证后即删,不入提交)

判据:对照 exit 0;针恰 exit 1 业务红;绝对 file/fullName 定位;唯一注入;实际执行数;
混错、skip、timeout、零执行、exit 2 均 invalid。

1. **C1 恰红 + 混错可辨**(`evidence/counter1-mixed.json`):临时针
   `src/shell/rng-player.glm-next-wave.counter1.test.ts` 故意把帧窗口合同写成
   "fetch 全部 4 帧",与真测同批跑 → 进程 exit 1,恰 1 失败(针 fullName 绝对命中),
   同文件对照组与真测 3 例保持绿。
2. **C2 绝对 fullName / 实际执行数**(`evidence/counter1-filtered.json`):
   `vitest run <针文件> -t "故意错"` → exit 1,执行 1 失败 1(faithful skip 对照组未执行),
   证明 `-t` 定位到唯一针且真实执行,非零执行假绿。
3. **C3 零执行陷阱(负反控)**(`evidence/counter-bogus.json`):
   `vitest run <真测文件> -t "Absolutely No Such Test Name"` → **exit 0** 但
   passed=0 / failed=0(2 skipped)。结论:vitest 4 对 `-t` 零匹配报 exit 0,
   **裸 exit code 不可作通过依据** —— 验收必须同时核对 passed 数 / fullName 执行记录。
4. 基线对照:9 文件全量 `--reporter=json` exit 0、40/40 passed
   (`evidence/vitest-new-tests.json`),与 C1 的 exit 1 形成红绿对照。

## 视觉:一条开场菜单(菜单-driver 域)隔离功能视觉

- URL `http://localhost:6093/`(6093 空闲端口,`E2E=1` HTTP 旁路,strictPort);
  视口 1440×900;IAB 真实浏览器;未启动新游戏、未走剧情、未重跑 E2E。
- 步骤:加载 → 「可选访问统计」点「拒绝」→ 启动过场至开场菜单
  (新的故事/旧的回忆)→ 截图 A → 点击画布聚焦 + `ArrowDown` → 截图 B。
- 预期/实际:光标高亮(黄)从「新的故事」移到「旧的回忆」——两张图可见选中态互换,实际一致。
  截图存 `/tmp/type-pal-glm-new-wave/I/`(按卡面路径):
  - `menu-opening-initial.png` SHA256 `eaf678b648bac34481ff9ca0a9cad9cee4aa70564f841b0edc96c51664d553b9`
  - `menu-after-down.png` SHA256 `277774d101a1bb1ab35743d1c693c4eaa072abdc34bb2a246733f001a9f5daaf`
- 运行态探针(页面 evaluate `window.__tpgs`,DEV hook):`devHookPresent=true`,
  `mode='menu'`,`menuStackTop.kind='opening'`,`wNumScene=1` —— 与画面一致。
- console:页面无 showError 错误横幅、无报错覆盖层;浏览器 console 未采集逐条日志
  (IAB 不暴露历史 console),以运行态探针 + 无错误横幅代替,如实说明。
- 本组 I01 的 dev 面板 B 键功能视觉未在浏览器执行(需进入 explore 模式 = 开新局走剧情,
  触碰卡面"不启动正式通关/不重跑 E2E"红线);B/F1 显式控制已由
  `dev/dev-panel.glm-next-wave.test.ts` 单测闭环,如实登记。

## 环境备注(不影响提交内容)

- 白名单偏差声明:共享 `docs/testing/glm-new-waves/README.md` 名义只读,但 docs check
  硬门要求新增子目录进入父导航(`子目录未进入导航` FAIL),按先例
  `docs/testing/README.md` × `background-tests-20260927/` 的既有登记方式,只在链接区
  加一行 wave-I 回执导航,未改任何共享判据/清单/他 wave 内容。
- 本 worktree 缺 gitignored `data/extracted`,已软链到主 checkout
  `/Users/zhangxu/illegal/type-pal/data/extracted`(仅本地环境修复,不随提交);
  `dev-panel.test.ts` 相邻批因此从 ENOENT 文件级失败恢复为绿。
- DOM 2D 替身说明:jsdom 不暴露 `CanvasRenderingContext2D` 全局且原生 ctx 原型带 host
  访问器,替身经 `Object.create(Object.prototype / 环境自身 ctx 原型)` 构造,零 `any`/
  零双强转/零 ts-ignore,只实现被测函数声明的端口(putImageData / fillStyle / font /
  fillRect / fillText);`HTMLMediaElement.prototype.play/pause` 替身与旧测同法。

## 待 Codex 独立验收

- 候选 SHA:见提交(分支 `codex/glm-new-i-r1` 推送 HEAD 完整 SHA)。
- 未证登记:I01 DEV 假分支(编译期替换不可构造);bootstrap() 全量编排(vitest 不可合法驱动);
  I02/I03/I04 三个 existing-proof 源(见逐组表);dev 面板 B 键浏览器视觉(避剧情红线)。
- 真实产品缺陷:无(全部测试基于现行行为;未发现需另开卡的隔离红诊断)。
