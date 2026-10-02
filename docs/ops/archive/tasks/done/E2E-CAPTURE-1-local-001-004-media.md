# E2E-CAPTURE-1 — 001–004本地录制工具与节省空间验证

Status: done
Phase: ops
Owner: Codex Root
Coding Owner: pre005_media_probe
Reviewer: Codex Root
Visual Verification Timing: E2E集中批次

## 当前交付结论（2026-10-02）

录制工具代码和限空间短样已由Root及独立审查接收，首部counter闭合；本卡按用户删除录屏后的
节省空间范围收口，**不声称修订后重录了八段整片，不恢复完整媒体验收结论，也不宣布系列capture-ready**。
原八段程序passed和RF001片头反例均保留为历史；已有录像由用户删除，后续仅在明确需要时按段重录。
002–004和普通verify不受001预热分支改变，当前PAL正文/游戏速度/存档没有变动。

## 范围与前提

[PRE-005-DEBT-1](PRE-005-DEBT-1-current-edge-closeout.md)已将当前001–004录制欠账列入本轮，
用户选择先清当前边角，服务器素材库保持发布阶段。只建设本地碎片录像，不接Content Studio活动/发布，
不宣布完整Q1/Q2或系列capture-ready。001–004仍共享已批准剧情边界、正常输入和结束断言。

| 维度 | 一手证据与目标 |
| --- | --- |
| 原版/primary | 本地录制工具N/A；不改任何原始剧情输入。目标为本次已验两阶段画面及原声，不录麦克风/桌面。 |
| 第一阶段 | audio.ts:249–252音效与audio-midi.ts:100–105 BGM是独立AudioContext输出；avi-player.ts:65–74入口视频另有全屏HTMLVideo。 |
| 当前二阶段/工具 | audio/sfx.ts:67–80、audio/bgm.ts:76–91分别输出，video-player.ts:34–49独立contain视频层；browser-journey:130–146拥有隔离context。现有Playwright录像链使用-an，不能承担原声音轨。 |
| 目标 | 只在自有E2E context引入记录支路；原声输出不改，capture独立节奏/回执，沿真实语义开始和结束，不夹入保存/取消专项。 |

## 实际准入小样

`/tmp/type-pal-media-probe.spidvu/`含probe.js/run.mjs/verify.mjs、原webm与可播放mp4。
11.01秒640×400约60fps，2独立WebAudio context（含AudioWorklet）、独立video原声、双音混合、
音量/静音与disconnect后静音、video→canvas、codec失败及资源释放，verification.json 40项通过。
Root直接读源码、原音频/视频消费路径并核ffprobe H264/AAC 48k，实际查看六关键帧。
音画边界偏差51–77ms，不称零延迟或长段已证。video.captureStream实测不跟随元素volume，
记录支路需同步volume/muted；首轮原始失败保留。该小样仅准入能力，不是正式剧情录像。

最强替代解释：只录canvas或合并错误音频支路也能生成有画有声文件。必须用真实视频层、两个原声源、
音量/静音及断连见证反证；正式长片须有音轨/帧/来源/语义边界检测，不能只检查文件存在。
Root premise verified / design agree / build allowed，冻结当前窄范围如下。

## 白名单与禁止事项

- 贡献者独立worktree；仅`scripts/e2e/`新增capture专属工具/测试，最小接入browser-journey、
  game/reforge opening、inn/kitchen/meal journey及参数解析/对应来源清单与邻近工具测试。
- 不改packages运行时、作者JSON、schema/save、速度、输入/碰撞、旧verify断言及超时，不改全局质量规则。
- `--capture`显式启用，普通verify逐项行为不变。只录001–004正常story；items/saves不支持capture并明确拒绝。
- 默认单canvas#screen与允许的同源全屏contain视频；不抓整个桌面/用户浏览器/麦克风，不绕过浏览器权限。
  显示中的未知视频/遮挡层、跨源/解码/音频失败、未能释放等应失败留证，不猜着继续。
- 安装在boot前，保留原AudioNode连接返回值、重连/断连合同；不重复混音、不关闭游戏context。
  捕获停止/异常/中断都释放自有支路、监听、帧回调和mixer，原原型还原；仅有限生命周期的测试instrumentation。
- 001在新的故事语义开始录，到001故事结束真实控制帧；002–004从可信前驱载入稳定后录。
  在验证专用菜单/存档/新页恢复前停录。capture不能作为下一段verify来源，不覆盖原verify检查点/历史回执。
- capture对实际显示正文增加有界可读停留，保留作者自然动画/自动续行及正常确认，不硬编码按键次数。
  capture独立总预算由正常视频+可读对白推导，verify既有预算不动，不以放宽等待掩盖未知状态。
- 回执标明本地capture、引擎/fragment、输入来源hash、源码revision/hash、语义起止、音视频codec/时长/hash、
  原声非静音、实际帧与失败信号。无声、空帧、停止失败不得输出passed。

## 验收

先冻结工具候选交Root独立读源码和工具负控，再集中执行两阶段001–004本地媒体批次。
可复用未变的已验verify donor，但不得手补剧情/物品/坐标。001开始新游戏自然视频；每段按合同收尾。
查看关键交接与正常剧情片段，核长段音画，保留原声/MP4等标准产物于ignored build，记录哈希与可重录命令。
工具测试及统一硬静态门零诊断；代码作者自验不能替代Root接收。

无用户转交提示词；Root内部接收，005在母卡清账前不启动。

## 冻结候选独立反控（2026-10-02）

`227cecace`工具163项/静态2764零诊断，自有实际Chrome无手势arm23.4ms、正常按键后音频解锁及
32项频谱/帧检查通过；Root和独立只读席均直接读取冻结候选，不以作者小样替代完整审查。
独立席counter两项、Root一手确认，正式8段尚未准入：

- P1晚期健康：game-opening:348完成录制后到:427置passed未再checkHealth，capture-local:108–244
  也不核健康；片尾转码/写回期pageerror、SIGINT、服务退出可能留下passed。需成功发布前后核健康，失败回执覆盖及实际控制器负控。
- P1局部原声失败：game audio-midi:147–150失败仅warn、audio:219–234音效解码吞错；当前只测整体RMS，
  另一音源尚有声可掩盖缺失。需capture-only观察已知音频失败/实际decode拒绝/网络音频失败，
  不改变生产处理与Promise/回调合同，不把普通Canvas warning或缺metadata一概当音频失败。

Owner按同范围窄返工；旧小样/失败保留。普通verify、用户系统音量与6012不变。
用户问声音后先停止重复有声探针，随后明确允许继续必要测试；当前自有capture Chrome静音输出，录音文件仍含原声。

### 返工独立接收与正式录制准入

新冻结`b9c776b0`，旧`227cecace`保留。Root直接读两次diff，独立席重新读真实音频caller/所有失败门并accept：
成功回执发布前后healthy，失败重写failed；game001最终health在passed之前。decode观察返回原Promise，原回调/同步throw
保持，cleanup恢复原型；console/网络失败只限制音频域。Owner174工具tests/2764静态零诊断，独立13项连接/解码/清理绿。
有效探针`/tmp/type-pal-formal-capture-probe.7wwgnW/run-1790931364179`与`run-1790931365856`源码hash匹配新冻结，
原report revision仍227，保持历史事实：BGM失败但SFX输出RMS0.0711、MP4独立解码RMS0.0692676仍failed；
SFX被吞EncodingError时BGM RMS0.0707448，仍failed无成功媒体。双context仍running、清理全部true。
此前两次无手势初态前提不满足的尝试不作音频失败证明。两P1闭合，Root准入集中八段，不改verify donor原字节。

## 正式媒体首部反控与用户存储决定

Root在794d0890代码冻结上跑两阶段001–004，八个runner/media均passed，普通RF004 verify亦passed；
实际文件/codec/原声与终态抽查后，独立原音相关发现RF001首部缺失，不能以程序passed替代完整媒体验收。
原game/RF intro文件SHA同为806efd7e0e0be814dc6a63aad287755b7610c98108ca8a281cf89835336aa90d，
原video34.466667秒/audio34.534014秒。game七窗口约+29.625ms，RF约-550ms且不随时间增长；
native WebM和MP4画面均比对应原片提前约0.58–0.60秒，不是转码或慢性漂移。原首0.55秒有实际声音，不是可省空白。
RF video-audio早于recording-start603.4ms；首次合成完成至recorder-start只有0.5ms，不能单独归因编码器构造。
原passed报告、失败结论与源码不改。修法尚为只读proposal：先连续录真实标题并验证编码器ready，再正常Enter，
最终从同一原始录制依明确时间标记裁取完整入口，不补黑、不拼接原视频、不seek或改游戏。

用户随后告知已删除录屏、硬盘空间紧张。Root已立即停止媒体生成/复录和分析子进程，不重建已删文件；
实际检查本轮八段story.mp4/story.webm全部已不存在，原声小样备份中的媒体也被删除，剩余小型报告仍是历史证据，
旧哈希清单描述删除前字节，不声称现在文件仍可回读。当前代码未实施首部proposal，本卡不done、不宣布capture-ready。
后续是否继续最小验证或停止补录按用户存储选择，不自动恢复大文件；6012保持原服务。

### 节省空间的首部代码收尾准入

用户再次要求继续。Root明确不补回八段整片，改为代码修复与几秒级、验完即删的最小样本验证。
Owner仍pre005_media_probe，build allowed仅capture-browser/local与相邻回归；不改产品/作者/普通verify。
真实标题连续预录，确认实际编码数据可解出帧后才允许正常Enter；记录原始媒体时间标记并从同一raw裁取。
不使用替代黑帧、不pause/resume拼接、不复制原视频充当录像，不分别归零A/V破坏偏移。
首视频路径避免同步读回阻塞，把安全检查放准备阶段与最终发布前；污染或媒体失败仍必须拒绝。
暖机限001/startOnVideo分支；002–004路径和两项已闭P1保持。先交冻结代码与真实小型反控，再由Root独立复核。
临时媒体总量限5MiB，优先内存pipe验证，真实片头只取2–3秒；finally删除自身精确临时媒体，
仅保留小型文字/JSON证据。不恢复已删除目录、不复制大备份、不再完整重走/重录001–004。

Root预审新增反控：原生video刚挂载但未解码时只画黑底，不能把该时点写成首个录制视频帧；
firstDraw须在第一次真实drawImage(video)、readyState>=2之后记录，独立于DOM视觉来源切换。
Owner补0.6秒晚解码反控；原生firstPresentedFrame不能替代被录合成帧。这不是调宽0.1秒判据。

## 首部修复最终接收

候选`71b363073`（Root接收`375e7975e`），仅两录制模块与相邻两测试：真实标题连续预录，
原生编码前缀经ffprobe实际解出完整帧后才ready，调用者await arm后正常Enter；同一时间戳同时裁音视频。
firstDraw只在真实drawImage(video)、readyState>=2之后登记一次；0.6秒晚解码且native首呈现为0仍拒绝。
001准备阶段和最终发布前检查origin-clean，保留所有未知遮挡/音源失败/晚期健康/清理拒绝。
live WebM前缀的已知EOF诊断保留为decoderNotes，其它解码诊断拒绝；不属于静态门豁免。

Root逐行审读、核两源hash与最终小样一致、逐项stat确认媒体确已删除；独立席46项回归通过并accept。
Root全E2E工具182/182、全仓lint2762文件0 error/warning/info；日志`build/pre005/intro-root-{tools,lint}.log`。
最终实际Chrome短样`/tmp/type-pal-intro-prime.Uo4xlx/run-1790934372342/probe-report.json`：
人为准备延迟600ms；encoder-start887.8ms→实际解码58个标题帧→ready1793.8→Enter1800.3→native play1809.4；
原生首帧和真实合成首帧mediaTime均0，真实合成耗时0.2ms。raw3.2091s，以共同PTS0.936裁头，预期2.2731s、实际2.287s。
原头0–0.6s红/绿/蓝完整保留13/12/12帧，440/660/880Hz音标幅度0.08003/0.07970/0.07950。
媒体349239字节＋内存输入34372字节=383611字节，远低5MiB；五个输出均finally删除，零媒体残留。
首轮合成输入B帧导致非零首PTS的前提错误只作原失败记录，不计产品失败，也未为其放宽首帧门。

无下一位Agent提示词，代码/限空间短样验收收口；今后请求完整001素材时使用修订工具重新录制并复核，
不以本卡done替代那次实际文件、观感或完整Q1/Q2验收。
