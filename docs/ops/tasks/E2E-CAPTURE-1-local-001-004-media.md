# E2E-CAPTURE-1 — 已验001–004本地原声录像

Status: rework
Phase: ops
Owner: Codex Root
Coding Owner: pre005_media_probe
Reviewer: Codex Root
Visual Verification Timing: E2E集中批次

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
