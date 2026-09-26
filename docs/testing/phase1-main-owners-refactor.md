# D2 第一阶段大主控所有权候选

Owner：Codex；基点 `d70d73b8`（已同步 `origin/main@9fe9ea11`）；实现头 `138c41c8`；所属
[连续治理卡](../ops/tasks/ARCH-CONTINUATION-1-remaining-queue.md)。本候选不合 main、不运行共享全仓
coverage 门；待原接收对话统一集成并执行 check/ratchet/strict。结构化计数、命令结果与未证项见
[机账](phase1-main-owners-refactor-evidence.json)。

## 所有权边界

- `event-opcode-player.ts` 单独拥有 22 个角色成长、装备、HP/MP、复活、毒/状态、法术槽 opcode 及其私有
  helper。统一 raw 入口仍同步委派，`event-system` 继续 re-export 原常量；新 owner 只收 `GameState`、三操作数、
  role context 与毒脚本同步回调。战斗专属 enemy opcode 仍是已消费 no-op，未创建第二解释器。
- `battle-runtime-context.ts` 单独拥有资源表形状、原 `__battleResources/__battleRunScript` 隐藏键、live roles
  查询、注入 runner 优先级和释放。为保持 fixture/序列化边界，没有趁重构改成全局 Map；对象引用和 hidden-key
  语义不变。
- `battle-finalization.ts` 单独拥有 lost/fled/watchdog 写回、临时状态/毒/Extra 清理、屏波恢复、对话/震屏/
  自动战斗释放及 0x07 事件接回顺序。`battle-progression.ts` 拥有主/隐藏经验、RNG 成长、上限和学法术；
  `battle-settlement.ts` 在既有 screen 数据之上拥有奖励建屏、post-script、首帧拒键、逐屏推进与胜利半血恢复。
  `battle-system` 仍拥有 start/tick phase 路由、选择、行动、动画与公式调用，不向新 owner 传伪造的全局 context。
- `bootstrap-resources.ts` 在调用当下先启动 soundfont，再同步启动场景主资源、glyph 与 dialog 三类 loader；分别
  暴露原始 soundfont promise、只表达 settle 的 barrier 和可装配资源 barrier。glyph 失败仍只 warn 并退化 tofu，
  soundfont 失败仍保留原 rejection 给 MIDI backend，但不阻断 playable settle。bootstrap 继续拥有资源消费、
  scene cache/切换和 UI gate。
- 行数：`event-system` 5570→5108，新增 opcode owner 427；`battle-system` 3749→3139，四个 owner
  98/67/306/246；`bootstrap` 1946→1931，新增启动 owner 64。行数只作边界证据，不把搬行数冒称行为收益。

## 回归、反控与真实数据

- D2-a 定向/相邻 7 文件 722 项；战斗最终定向/相邻 13 文件 342 项；启动资源 6 文件 27 项；Game
  TypeScript 与候选 Biome 均通过。
- Game 包全量使用候选 worktree 到主仓真实 `data/extracted` 及五个 raw MKF 的临时只读式 symlink：167 文件/
  2459 项通过，2 文件/7 项按既有条件 skip。第一次只连接 extracted 时，唯一五红均为 raw MKF 不存在的
  `ENOENT`；补齐五个明确 raw 链接后全绿。所有临时链接由 trap 解除，没有生成、修改或提交资产。
- production build 157 modules 通过，只保留既有大 chunk 提示。
- [玩家 opcode 六针](phase1-player-opcode-mutants.mjs)固定 HP 增量、单件装备原位换物、毒抗、升级成长、
  battle-only 消费与法术去重；control 6/6，六针全检出。最终临时摘要：
  `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-phase1-player-opcode-mutants-Tir7ID/summary.json`。
- [主控九针](phase1-main-owners-mutants.mjs)固定资源引用、runner 优先/释放、999 状态阈值、战后分支、升级成长、
  启动 scene 采样、glyph 降级与 soundfont rejection；control 19/19，九针全检出。最终临时摘要：
  `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-phase1-main-owners-mutants-h3Ek4a/summary.json`。
  两个 runner 均要求精确 absolute file/fullName、唯一 loader marker、恰一个 `AssertionError`、exit 1、无环境/
  timeout 异常且产品 hash 不变。

## 保持项与未证项

本批是所有权重构，没有夹带真 bug 修复；SAVE8/content20、opcode 常量、公式、RNG 抽取、玩法、奖励/UI、
资源 URL/格式、scene cache、资产和正常存档零改。旧 `event-system`/`battle-system` public 入口继续 re-export，
不是长期兼容分支，也没有复制状态 owner。

未运行全仓 check、官方 coverage ratchet、受保护 strict、full/Q1/Q2 或远端 CI，未更新官方 coverage 基线，
未执行正常存档持久化。没有浏览器剧情/玩法视觉核验；本批的运行期证据是现有真实机制回归、真实 PAL 数据/MKF
对拍、反控与 production build。D2 只在候选树达到 opcode 族、战斗终态/资源主控、启动加载生命周期边界齐；
须由原接收对话同步当前 main、统一门并合 main 后才能正式标完成。
