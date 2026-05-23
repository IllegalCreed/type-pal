# 03 · 开发计划

## 原则:垂直切片优先

整个游戏太大,不可能一次写完。开发顺序遵循**垂直切片优先**:先用很小的范围把"资源转换 → 加载 → 渲染 → 玩法"整条链路打通,证明架构可行,再横向铺开补全部内容。

`pal-extract` 工具也增量做:先只提取垂直切片需要的那点资源,后面再补全所有 MKF 格式。

## 里程碑

### M0 · 项目骨架与工具链
- 建 pnpm workspace monorepo:`pal-extract` / `game` / `shared` 三个 package(见 D19)。
- TypeScript、Vite、Vitest、Biome 配好。一个本地 `pnpm check` 脚本(类型检查 + 测试)—— 不做 CI。
- 仓库目录结构、README。

### M1 · pal-extract 打通最小链路 ✅(2026-05-23 完成)
- **共享底层**:MKF 归档读取 + **YJ2 解压**(Win9x 版用 YJ2 不是 YJ1)+ RLE 解码。
- **资源管线(切片)**:开局 scene 1 = mapNum 12 的 tilemap(128×64×2 cells)+ 该地图的 323 个 tile bitmaps + 9 个 palette。字库不要(D11)。
- **数据表(全量,顺手吃了原 M4 这条)**:235 items / 102 spells / 153 enemies。注:items / spells / enemies **实际住在 SSS.MKF chunk 2(OBJECT 数组)**,不是 DATA.MKF。
- **事件管线(全量)**:字节码反汇编器(双向 opcode 注册表 ~15 个具名 + raw 兜底)+ 可达性切分(295 scenes + shared.json + objects.json)+ WORD.DAT/`symbols.json` 注释 + **全量 SSS.MKF chunk 4 byte-level round-trip(43503 条指令 ✅)**。
- 产出 `data/extracted/` 在 `.gitignore` 中,由 `pnpm extract` 一次性生成,M2 直接消费。
- 91 个单元 / 集成测试全过,`pnpm check` 绿。
- 详细设计见 [`plans/2026-05-23-m1-pal-extract-design.md`](plans/2026-05-23-m1-pal-extract-design.md);实施过程发现 / 偏离见 [`plans/2026-05-23-m1-pal-extract.md`](plans/2026-05-23-m1-pal-extract.md) 末尾「实施过程发现」。
- **Task 20 sdlpal RLE 对拍 harness 推迟到 M3**(战斗差分本就需要 sdlpal headless 基建,统一做)。

### M2 · 运行时垂直切片(探索)✅(2026-05-23 完成)
- ✅ 资源加载层、表现层最小渲染:scene 1 真实地图 + 真队长 / NPC 精灵
- ✅ 场景系统:走路 + 边界 clamp(碰撞属性 M3 补)+ 相机
- ✅ 事件系统最小集:消费真原版 scene-001.json,onEnter 自动播 + Confirm 推进对话;走到 NPC 前 Confirm 走 trigger 段
- ✅ pal-extract 补:角色 / NPC sprite + scene-1.json + 4 个 setDialogStyle opcode 具名
- ✅ EventSystem 对未具名 raw = no-op skip + console.debug
- 详细设计见 [`plans/2026-05-23-m2-runtime-slice-design.md`](plans/2026-05-23-m2-runtime-slice-design.md);实施过程发现 / 偏离见 [`plans/2026-05-23-m2-runtime-slice.md`](plans/2026-05-23-m2-runtime-slice.md) 末尾「实施过程发现」。
- 180 个 Vitest 单测全过(M1 旧 91 + shared 20 + game 56 + pal-extract 增至 104),`pnpm check` 绿。`pnpm extract` 重跑产物完好(全量 events round-trip 仍逐字节通过,12 个 sprite / 75 帧)。

### M3 · 战斗垂直切片
- 事件能触发一场战斗。
- 最小回合制战斗:普通攻击、回合顺序、胜负判定、经验。
- 战斗 UI 最小版。

### M4 · pal-extract 补全
- 覆盖剩余 MKF 格式(M1 未碰到的:F / MGO / PAT / SOUNDS 中的非切片部分等)。
- 全场景资源提取(剩余地图、剩余精灵、剩余调色板)。
- 全数据表(物品 / 法术 / 怪物等全量)。
- 注:**反汇编器骨架与全量 events round-trip 已在 M1 完成**(D22);剩余 ~80 个 opcode 的具名工作 M3 战斗 / M5 菜单等里程碑按玩法增量补,M4 兜底。

### M5 · 系统补全
- 完整战斗:五行相克、法术、战斗道具、敌方 AI、逃跑、奖励结算。
- 菜单系统全套:背包、法术、装备、状态、商店。
- 存档 / 读档(IndexedDB)。

### M6 · 体验补全
- 音频接入:CD 音轨(`TRACK*.ogg`)直接用;BGM(`.mid`)运行时 SpessaSynth 合成;音效从 `SOUNDS.MKF` 解包后接入。
- AVI 过场转 mp4/webm 并接入。
- 转场特效、调色板循环动画(水 / 火)。
- 结局流程。

### M7 · 通关验证与打磨
- 从头到尾能通关。
- 对照原版 / sdlpal 校验忠实度(数值、剧情、触发)。
- 打磨手感、性能。

## 第二阶段(本次范围之外)

忠实移植完成后,才考虑扩展能力:现代脚本 API、内容编辑器、新场景 / 剧情 / 玩法等。架构已为此留好空间,但不在当前计划内。

## 实现细节备注

- **音频管线**(已按实际数据核对,见 `04-decisions.md` 数据核对结论):Win9x 版无 RIX,**不需要 OPL 渲染器**。
  - AVI(msmpeg4v3 + mp3)→ ffmpeg 直接转 mp4/webm。
  - CD 音轨 8 个 `.ogg`(Vorbis)→ 原样使用。
  - BGM 86 个 `.mid` → 不预转换,原样进资源,运行时用 SpessaSynth 合成(见 D10),另配一个 SF3 音色库。
  - 音效在 `SOUNDS.MKF` 内 → `pal-extract` 解包后再转 ogg。属实现细节,到 M6 再处理。
- **测试基建**:测试策略见 `06-testing.md`。round-trip 验证随 events 转写器一起在 **M1** 做完(D22);sdlpal RLE 对拍 harness 也在 M1 起最小版;`.RPG` 解析、dev 调试面板、输入录制 / 回放 在 M2–M3 按需逐步搭。
- 每个里程碑进入实现前,应单独写一份实现计划(plan),再编码。
