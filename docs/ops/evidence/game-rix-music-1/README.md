# GAME-RIX-MUSIC-1 验证证据

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- GAME-RIX-MUSIC-1 验证证据 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 465caf6e585718d437affadcfc33761c89f2387116e059a03fc823f18010b831。

## 来源与输入

- caller/source refs、合法输入、版本和执行环境以原始证据与对应 task card 为准；本次只做静态迁移，不重跑。

## 断言与业务 oracle

- 原始业务 oracle、逐合同/逐针排重和失败边界保持原时点语义；历史“通过”不升级为当前 verified。

## 结果

- 原始结果、退出码、产物、warnings、counter 和未决项由 quote 保留；本页不补造执行结论。

## 限制与复核

- 本批未执行 runtime、E2E、视觉或 coverage。若重新启用，需当前 task card、合法输入、真实 caller/oracle、fresh receipt 和独立验收。

## 历史范围

- 源 revision 381cab90f8d6cc26171bd4bc8c2b025c15bc6f36；本轮 R70。历史 ops evidence 只作时点回执，不授权当前操作。

## 原始结论

- GAME-RIX-MUSIC-1 验证证据：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `381cab90f8d6cc26171bd4bc8c2b025c15bc6f36`，source SHA `465caf6e585718d437affadcfc33761c89f2387116e059a03fc823f18010b831`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # GAME-RIX-MUSIC-1 验证证据
>
> 本目录对应 [任务卡](../../archive/tasks/done/GAME-RIX-MUSIC-1.md)。日期为2026-10-15（日本时间）；Git分支为codex/game-rix-music。实现阶段候选的文件摘要、执行命令、退出码和映射见 [verification-manifest.json](verification-manifest.json)；后续正式发布以 [production-release.json](production-release.json) 为准。原始机器输出保留字节，不修改失败记录；含终端尾随空格的原件使用`.raw.gz`无损压缩，可用`gzip -dc`查看，其余使用`.raw`。
>
> ## 真源与编译
>
> 原始mus.mkf共331284 bytes，88个槽中86个非空，0与29为空。提取文件与原始文件逐字节相同；重生成两次均为资源版本7b0cf09680554792、2906文件，相比原清单仅新增music/mus.mkf。提取日志为extract.raw与extract-idempotent.raw。
>
> [来源清单](../../../../packages/game/vendor/rix/source-manifest.json) 固定SDLPAL树ee23013943973ad9eb67e1d272e56ed6dff67ce0与原文件/适配文件摘要。[适配补丁](../../../../packages/game/vendor/rix/browser-adapter.patch.gz) 和 [编译说明](../../../../packages/game/vendor/rix/README.md) 可重建24294-byte WASM。Emscripten4.0.23、`-Wall -Wextra -Werror`编译零诊断，无主机imports、SDL、文件系统或共享内存。
>
> [native-reference.cpp](native-reference.cpp) 用未适配的上游rix/player/Nuked源和原生文件加载器，以绝对有理数时间截止点生成独立PCM。临时common.h只包含cstdint、strings.h和SDL_strcasecmp别名。原生命令为`clang++ -O2 -std=c++14 golden.cpp adplug/rix.cpp adplug/player.cpp adplug/fprovide.cpp adplug/binio.cpp adplug/binfile.cpp -o golden`。输入为本仓作者编写的 [单音fixture](../../../../packages/game/src/__tests__/rix-fixture.ts)，不是原游戏音乐。44100/48000Hz各自循环/非循环2秒的四个PCM摘要见 [reference-golden.json](reference-golden.json)，WASM逐字节匹配。native-reference-build.raw保留上游未适配分支的pointer-size警告；本项目采用的WASM编译没有诊断。不据此声称1995硬件逐比特还原。
>
> [all-tracks.json](all-tracks.json) 是全部86首在44100/48000Hz各渲染10秒的实测原件，全部有非零PCM。可用`pnpm exec tsx docs/ops/evidence/game-rix-music-1/scan-tracks.mjs`复核。此测试证明可解码与输出，不证明每首听感。
>
> ## 本地真实浏览器与缓存（发布前）
>
> [browser-smoke.mjs](browser-smoke.mjs) 从仓库根以Node运行，启动独立HTTP preview6007并在finally清理服务，使用已安装Chrome的真实AudioContext、AudioWorklet、WASM。音频分析器只接在真实音乐gain后；没有替换合成输出。临时挂钩用于记录真实Context和RIX意图，SFX Context不计为音乐实例。
>
> [browser-smoke.json](browser-smoke.json) 原始请求和输出：FM峰值0.131909、MIDI0.406836、静音0、刷新FM0.168347；每阶段仅一个活音乐Context。刷新保留FM且没有SoundFont请求。FM启动仍可能下载共有MIDI代码包，但不下载6MB音色库。
>
> 最初真实浏览器显示SW缓存有mus.mkf、assets为空，见browser-cache-before.raw。实际SW handler的响应被客户端消费后，延迟执行的clone失败，导致按需资源未入库。修复为先clone并用waitUntil保活，响应不等待缓存写入。最终缓存实际包含WASM、worklet和曲库；杀掉preview6007并确认HTTP连接失败，再设置browser offline、从MIDI切回FM，峰值0.157727，单一活音乐Context、pageerrors为0，见browser-final.raw及browser-smoke.json。这里验证的是已打开页面重新初始化FM；既有SW策略不缓存导航/index.html，不声称离线首次开页或离线刷新。
>
> [桌面截图](fm-desktop.png) 为1200×800，[窄屏截图](fm-mobile.png) 为375×667；音源设置可达且无横向裁切。这些本地报告只验证Chrome，不包含Safari/Firefox或远端部署；后续生产浏览器和部署证据见文末Production release，Safari/Firefox仍未实测。
>
> ## 回归与反控
>
> - 时钟：clock-red.json.raw/raw为48000Hz循环PCM的唯一业务断言红，0 pending。clock-mutant-bridge.cpp.raw把分数采样时钟改为`(rate / 70) * 70`；clock-counter.test.ts.raw为同一独立native摘要的探针。clock-counter.raw是补充直接assert。canonical WASM恢复后通过。
> - 旧MIDI错误：midi-red.json.raw/raw为10项中恰1项旧网络拒绝错误串到新音源的业务红，0 pending。对应counter-candidate-audio-midi.ts.raw与counter-candidate-audio-midi.test.ts.raw；仅删除doPlay catch的代次守卫。它们是历史10项候选，不能代表最终12项候选。
> - 最终MIDI：midi-return-red.json.raw/raw为12项中恰A→B→A的业务断言红，0 pending。对应final-candidate-audio-midi.ts.raw及final-candidate-audio-midi.test.ts.raw；只删除提交新sequence前playingTrack失效语句。counter-final-restored.json.raw/raw为最终MIDI12项和时钟1项全部恢复绿，执行身份按文件尾名与fullName比较。
> - SW：sw-red.raw.gz为本仓原SW（sw-before.js.raw）与最终同一两项真实Response测试的1红1绿、无跳过；sw-restored.raw为2绿。两项分别证明200完整资源在客户端先消费时仍入缓存且注册保活Promise，以及合法Range/206响应正文保持、不会放入完整资源缓存。
>
> 带setup-failure的报告都是工具收集/路径失败，不能算有效反控；midi-return-targeted-red有11个未选中项，只作为历史补充。最初10项反控的counter-restored记录11项绿；最终另有13项恢复结果，不混用候选或测试数量。临时反控工作树只运行候选复制件，未覆盖仓库canonical实现或WASM。
>
> ## 质量门
>
> 最终静态门、覆盖率、构建和文档检查的原始日志与结论由任务卡及verification-manifest记录。coverage-intermediate-failure.raw.gz保留中间pal-extract行率下降的失败；删除冗余日志并合并到既有Musics计数后行率恢复。coverage-retirement-rejection.raw.gz保留全仓19857项绿、736生产文件、所有比率无下降但精确测试退役阻挡ratchet的原始事实。
>
> 旧setBgmVolume全局API已删除；唯一对应notThrow测试没有输出oracle而退役。当前实例gain、初始化队列与音源切换均有真实caller回归。精确3→2数量、旧/新身份摘要、最终测试文件hash登记在approved-test-retirements；保护判据没有放宽，没有保留假兼容API、增加coverage排除或弱测试。最终origin/main保护的重跑已通过，见coverage-final.raw.gz；19857测试、736生产文件，总Statements89.69%、Branches83.51%、Functions89.35%、Lines91.57%，12项指标提升、8项范围变化，基线未下降。
>
> ## 用户反馈后的选择框样式
>
> 2026-10-15：用户指出音源框38px比相邻按钮32px高、箭头贴边。专用样式把高度统一到32px，箭头右间距12px、文字右内边距34px；保留原生select与键盘交互。当前用户预览已刷新，实际DOM测量32px/32px，见 [截图](music-select-refinement.png)。工具面板18项回归和生产构建通过，原件为music-select-tests.raw.gz、music-select-build.raw。原先覆盖率/浏览器报告保留原验收候选身份，不冒充本轮重跑。
>
> ## 工具面板整体统一
>
> 用户继续指出计时器下拉与按钮不同高后，已统一六页签的表单/文字按钮：32px高度、14px字号、5px圆角、8px组内间距。移除存档/计时器局部小号覆盖，统一全部下拉、焦点、隐藏和窄屏换行，保持暖色工具面板风格。详细规范、实际桌面/375px数据、截图、测试范围和jsdom局限见 [整体复核](tools-style-audit.md)。
>
> ## Release verification (2026-10-15)
>
> User accepted the feature and style. [Preflight](release-preflight.json) records the all-target deployment and additive resource delta. [Final release verification](release-verification.json) records README/license/deploy-script corrections, independent acceptance, byte-identical strict WASM rebuild and static gates; original compiler environment and JSON-format failures are retained separately from successful runs. The original verification manifest above describes its earlier candidate. Completed CI, production verification and issue closure are recorded in the Production release section below.
>
> ## Production release
>
> Feature PR [#5](https://github.com/IllegalCreed/type-pal/pull/5) passed CI at 517dc8571 and merged as 8f5d17ff1. The all-target release is live at https://pal.illegalscreed.cn/ and [issue #4 is replied and closed](https://github.com/IllegalCreed/type-pal/issues/4#issuecomment-6182581943).
>
> [Release receipt](production-release.json), [production file/PCM verification](production-verification.json), [browser smoke](production-browser.json), [screenshot](production-rix.png), [issue closure](issue-closure.json), and [branch cleanup](branch-cleanup.json) distinguish deployed source, infrastructure corrections, original failures and successful checks. `production-verify.mjs.raw` is the exact executed local verification program. Full CI, original MIME rejection, tar messages, nginx validation and successful clean extraction remain losslessly compressed. No second application swap replaced the original rollback build.
>
<!-- original-source-quote:end -->
