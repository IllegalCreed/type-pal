# GAME-RIX-MUSIC-1 - 第一阶段 MIDI / DOS FM 音源选择

Status: review
Phase: phase1
Coding Owner: Codex
Reviewer: state_plan_review（只读独立复核）
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Branch: codex/game-rix-music

## 目标与范围

第一阶段工具面板→系统→音频提供音乐音源 MIDI（默认）/DOS FM（RIX）。记住浏览器偏好，切换重播当前曲目，沿用音乐音量、静音和游戏音乐开关；不修改存档格式和第二阶段。

范围：RIX/OPL WASM、AudioWorklet、音乐后端生命周期与异步取消、音源控制器、设置入口、按所选音源启动加载、提取 mus.mkf 与资源清单、必要回归与浏览器验证；实际离线核出SW按需缓存clone时序缺陷，修复响应提前克隆与缓存写入保活。2026-10-15用户已明确授权合并、部署、公开回复关闭issue #4和已退役分支清理。

## 前提真值门

行为前提：两种资源的曲目编号一致，脚本继续发相同音乐意图，由玩家选择的后端合成。

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 原始 mus.mkf 331284 bytes，88块中86非空，RIX magic 0x55aa（字节aa55）；与Musics的86个MIDI编号一致，29为空。RIX含FM参数而非波表采样。 | data/raw/mus.mkf SHA256 8367c9d34331f67b20b12380e809a38d3313cae199f260d272d07fcf55e11a21；reference/sdlpal/adplug/rix.cpp:142、261、290；reference/sdlpal/rixplay.cpp:175、189 |
| 第一阶段 | 当前SpessaSynth MIDI；MusicBackend分离音频意图，工具面板已有三路音量。脚本淡出参数目前未传递，MIDI沿用既有行为。 | packages/game/src/shell/audio.ts:25；packages/game/src/shell/bootstrap.ts:462；packages/game/src/tools/tools-panel.ts:587；packages/game/src/core/event-system.ts:3625 |
| 当前二阶段 | N/A：本卡仅第一阶段，二阶段编辑器与内容模型不消费此后端。 | CLAUDE.md阶段纪律 |
| 本任务目标 | 默认MIDI并可选DOS FM，选择持久化，实时合成，切换不叠音。 | 2026-10-15用户确认“可以，要不然你实现一下？”；前一轮明确设置/默认/重播/持久化方案 |

最强替代解释：Win95脚本使用与RIX不同编号，或音色不同只是SoundFont问题。已直接核编号集合一致；RIX独立FM参数由OPL合成，换GM库不能替代。
反证：实际RIX按同编号不能解码、无声音、浏览器处理超音频预算，或循环/切曲破坏真实音乐意图，即撤回完成结论。
用户可见 before→after：只有MIDI→可选MIDI/DOS FM；用户2026-10-15已批准。

## 上下文锚点

- [CLAUDE.md](../../../CLAUDE.md)：阶段纪律、原版真值、零诊断、修改后真实验证。
- [工程经验](../../phase1/engineering-notes.md)：5.4当前TimGM6mb；保留用户音色选择与音量。
- [工作流](../agent-workflow.md)：取消固定三签，保留独立复核、原子业务测试和反证。
- reference/sdlpal/adplug/rix.cpp、rixplay.cpp、adplug/nuked/opl3.c.h：70Hz更新、循环不重置芯片、FM合成。
- packages/pal-extract/src/cli.ts:556：MIDI/CD提取入口；提取真源改完重生成，不手改产物。
- packages/game/src/shell/audio-midi.ts：异步加载、autoplay解锁；新增切换需取消过期请求并释放旧Context。
- packages/game/src/tools/tools-panel.test.ts、shell/bootstrap-resources.test.ts、shell/audio.test.ts：已有caller与测试。

## 设计与风险

- 固定来源和工具链版本，仅编译RIX及Nuked OPL必要源文件，WASM与可重建脚本同仓。最小内存加载适配，不引入SDL/完整引擎。保留第三方许可及补丁记录。
- AudioWorklet持有非shared WASM内存，主线程预取模块/曲库后传入，实时pull生成PCM；不用跨域隔离或主线程定时器。
- 保持曲目原编号/空29，0停止；70Hz按采样累积推进，循环保留芯片状态；首次加载/停止/切换用代次取消。
- 音源控制器统一gain与dispose；切换停止释放旧后端，初始化失败向玩家显示并允许重试，偏好不写存档。
- FM启动不下载MIDI音色库；资源进入extracted及manifest，WASM/worklet进入带hash的assets供部署与缓存。
- 本次先保持既有脚本切曲/停止行为；不擅自扩展为DOS版剧情或视频替换。FM所需循环和采样率正确性完整验证。

## 验收条件

- 首次默认MIDI，选择FM后当前曲重播，刷新保留；MIDI↔FM切换无叠音，静音/音量/游戏音乐开关生效。
- 所有86曲解码；空29与停止不串曲；非循环胜利曲停止，循环重播；快速切曲/停止/初始化取消不复活旧曲。
- typecheck、lint、构建零诊断；音源/后端/提取回归，既有相关测试；官方覆盖率门实测。
- 浏览器真实AudioWorklet+WASM输出，桌面与窄屏设置可达，刷新/快速切换/音量/静音/离线缓存证据。跨浏览器性能按实际验证范围报告。

## 当前模式推进记录

- Codex premise verified：以上原始资源与接口证据；独立reviewer正在核同一证据。
- Codex design agree：单一写入Owner，白名单game音频/工具UI、pal-extract音乐提取、WASM构建/源/许可和本卡证据。
- build准入：Codex build allowed；用户批准设置与两音源方案，固定三签不适用。
- 独立验收：state_plan_review已只读accept最终MIDI交错、SW缓存根因与精确测试退役；未代替Codex测试/浏览器。
- Codex technical accept：全部功能/独立审查/静态门/官方覆盖率/真实浏览器已核；卡留review等待用户试听。
- 用户体验验收：2026-10-15用户“可以了”accept；明确授权提交/推送/CI后合并/阿里云部署/回复关闭issue #4/清理多余分支。

## Build / Review / 证据

实现、独立复核及用户试听/样式验收已完成；进入CI与正式发布收口。完整原件与候选映射见 [证据说明](../evidence/game-rix-music-1/README.md) 和 [verification-manifest](../evidence/game-rix-music-1/verification-manifest.json)。

- 默认MIDI；工具→系统→音频音源下拉切换MIDI/DOS FM，偏好localStorage。切换使用AudioManager有效曲目/loop（含胜利非循环曲），沿用音量/静音/游戏开关，退休后端释放Context。
- RIX资源提取到extracted/manifest；WASM24294 bytes，无host imports。所有86曲在44100/48000Hz各10秒非零PCM；四个作者fixture独立native PCM摘要逐字节匹配。原版硬件听感不由PCM参考实现证明。
- MIDI复制SoundFont避免transfer后重复选择失效；异步加载/解析按代次过滤，序列化无请求ID的解析确认；A→B待确认→A重新装载、自然结束同曲重播、失败回传/重试、停止/释放均有caller回归。
- 提取两次幂等，版本7b0cf09680554792、2906资源；相比原清单仅新增331284-byte music/mus.mkf，原始/提取字节相同。已有CLI fixture补合法MKF输入，不手工改生成资源。
- 真实Chrome：FM→MIDI→FM、静音输出0、刷新记住FM且无SoundFont下载，每阶段只有一个活音乐Context；桌面1200×800/窄屏375×667已看图。停止隔离preview6007后，在当前页重新切FM，三项资源从SW缓存加载、PCM非零、pageerrors0。离线首次导航/刷新不在既有SW缓存策略内；未验证Safari/Firefox、未部署。
- 实际SW缓存缺陷：延后clone时body已被消费者使用；修复提前clone及waitUntil。两项原子回归使用真实Response，200先消费body/延迟cache open、合法Range/206不入完整缓存；原SW1业务红1绿，恢复2绿。
- 反控：48kHz floor时钟1业务红0pending；旧网络错误代次10项恰1业务红；最终A→B→A12项恰1业务红0pending；最终恢复MIDI12+clock1全绿。setup失败与targeted未选中报告另保留，历史10项候选不冒充最终12项。
- 独立复核：reviewer直接核来源16个hash，提出并闭合post-ready错误回传、异步MIDI解析错误/过期错误、A→B→A、SW保活断言与合法206输入；最终accept。其最终MIDI读取hash118a645461e4ca3dac7583a4ca7fc485149d64f3204f37d5408f21593fe017bc，测试hash5310870943689fd623d4d29f4e5cd4443c422411e90793750725c0574bc8d155。
- 全仓typecheck通过；Vite与Emscripten编译零诊断；最终lint4019文件、0error/warning/info；e2e工具测试397/397。全game和pal-extract回归已跑，最终官方fast覆盖率包含当前新增合同。
- 唯一测试退役：旧全局setBgmVolume已删除，其notThrow测试无音量oracle，原文件3→2；实例gain与生命周期caller回归替代。按用户“测试少而精”纪律，Codex及只读reviewer独立核精确count/digest/hash并登记退休账（14文件/41项），未改保护判据或覆盖范围。首轮ratchet仅在该退役审计阻挡，所有比率已未下降；最终使用origin/main保护+显式scope-removal重新实测通过：19857测试全绿、736生产文件；基线12项指标提升、8项范围变化，无覆盖率下降。总Statements89.69%、Branches83.51%、Functions89.35%、Lines91.57%。

## 用户反馈：音源选择框样式（2026-10-15）

- 用户指出选择框过高、与周边控件不协调，原生箭头紧贴右侧。实际浏览器测量为38px，而全屏按钮为32px。
- 增加专用tp-select样式，高度32px；主题色箭头距右侧12px，文字右内边距34px。保留原生select、键盘操作和现有音源切换逻辑；增加可见键盘焦点。
- 真实预览复测32px与32px一致，箭头位置为right 12px center。已刷新用户当前预览并显示系统页，截图见 [调整后](../evidence/game-rix-music-1/music-select-refinement.png)。相关工具面板18/18回归通过，typecheck、lint、文档门和生产构建均通过，静态零诊断。本轮为样式迭代，没有重新执行官方覆盖率；上方19857项报告对应原实现验收时点。

## 用户反馈：工具面板统一控件规范（2026-10-15）

- 用户提供计时器节点选择/跳转按钮反例，授权整体检查当前工具面板组件。实际浏览器：计时器按钮25px/13px字，下拉38px/14px字，最佳时间输入约35.6px；不是单一音源框的问题。
- 前提锚点：packages/game/src/tools/tools-panel.ts 的tp-btn、tp-input、tp-save-row覆盖，以及buildTimerTab跳转/最佳时间行。原版/二阶段N/A：本次是第一阶段自有浏览器工具UI，不改变游戏机制、存档和业务动作。
- Codex build allowed：同Owner同会话样式迭代，统一32px高度/14px字号/5px圆角/8px组内间距，原生下拉共用箭头与留白；合并局部覆盖、操作行窄屏换行、统一可见键盘焦点及表单可访问名称。保持深色金边红按钮与现有导航/动作。只读reviewer查遗漏，不写实现。
- 验收：实际检查六个页签、桌面/375px下拉与按钮同高、不横向溢出；最小回归、typecheck、lint、构建与文档门。技术与视觉已实测：现有工具/速通99项、最终面板18项回归绿；实际IAB桌面689px及375×667六页均无横向溢出，可见控件32px/14px，原生下拉和键盘焦点可用，已恢复viewport。只读复核accept，详细 [整体规范与验收](../evidence/game-rix-music-1/tools-style-audit.md)。typecheck/lint/文档门另按本轮日志记录；旧覆盖率报告不冒充本轮重跑。

## 用户验收入口

本地 http://localhost:6006/?skip-intro=1 →进入游戏→左下角工具。样式复验：在计时器页看节点下拉与跳转按钮同高，在系统页看音源及存档按钮同高；窄窗口中操作行可换行、文字不裁切。音源试听进入系统→音频。试听MIDI/DOS FM切换与音量/静音，刷新确认记忆选择。本入口对应实现验收；后续正式上线和issue回复已获2026-10-15用户授权。

## 下一位 Agent 提示词

无下一位 Agent 提示词；用户已体验accept，Codex负责CI、合并、上线和issue回执。

## 发布收口（用户2026-10-15授权）

- 目标issue为 [#4](https://github.com/IllegalCreed/type-pal/issues/4)。UI与音源已获用户accept，正式CI/合并/发布/回执进行中，卡保留review。
- 按现有scripts/deploy.sh执行all：先数据与manifest、再原子切换应用；本轮新增mus.mkf，不能只发app。部署设置COPYFILE_DISABLE=1避免上次macOS附带元数据；保留远端dist.old回退。
- 发布前同步16项tracked机器库存（仍为待核，不冒充质量专项完成），最终覆盖率与原生CI按当前HEAD验收；上线核HTTPS主包/WASM/worklet/曲库/清单和真实播放器后才回复并关闭issue。
- 清理仅针对本次已合并与明确退役分支；其它仍有独立工作树/未合并工作的分支先核提交关系。

- 发布只读复核发现并修正：中英文README补实际WASM构建与第三方来源；四个改编LGPL源码补修改日期/说明并重算source-manifest与完整补丁；deploy.sh固化COPYFILE_DISABLE=1。注释变更后严格重编核二进制一致，独立复核后再提交。

- 发布修正独立复核accept：四份补丁可精确重建、16项来源hash匹配；EMSDK_PYTHON明确使用3.13后严格重编exit0/零诊断，WASM仍40c1a1df…6815c13。首轮Python环境失败与JSON格式诊断保留原件，最终lint4024文件零error/warning/info；文档门通过，最终覆盖率另行落盘。见 [发布验证](../evidence/game-rix-music-1/release-verification.json)。
