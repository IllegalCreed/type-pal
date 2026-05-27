# 工作约定

**用户跟 Claude 之间的硬约定 — 违反就是 bug。**

## 测试 / 验证

- **图是给用户看的,不是 Claude 测试过不过的标准。** Claude 不识别截图。
- **Claude 用数据 / log 测试**:gs 状态 dump、log line 对比、字节级 diff。
- 数据不够 → 加 log,不要靠截图。
- "vitest 全过" 不等于 "功能对" — 单元测试只测单 opcode 字段写入,**不**测 sdlpal 真值视觉行为。不要拿"测试通过"当"修好"的证据。

## sdlpal 真值

- **所有 sdlpal 改动只通过 patch**,不能改 `reference/sdlpal/` 树。否则基准就失了。
- 任何 cutscene / dialog / scene-transition 等修改前,**先 grep sdlpal source 真值**(`reference/sdlpal/*.c`),再写实现。不要凭推理修。
- 用户的需求都是对照 sdlpal 真版本发现的,**不是瞎编的**。先信用户。

### 截图 vs 修改依据(强硬约束)

- user 给的 sdlpal Win95 真值**截图**是用来**发现 bug** 的(指出 visual 跟我目前实现哪里不对),**不是修改的依据本身**。
- **所有修改必须在 sdlpal source(`reference/sdlpal/*.c` / `*.h`)找到对应出处**(行号 + 真值 macro / 函数 / 字段),再改 ts 实现。
- **不许**凭截图 visual 自己猜着 fix。原因:Unifont 16×16 stroke 跟 sdlpal 原 font 不同 / palette index 渲染色不同 / shadow algorithm 差异 — 截图视觉**对不齐 ≠ sdlpal 真值错**;真值对了 visual 自然就对了,**反之不成立**。
- 反面案例(2026-05-27):user 给 sdlpal Win95 截图 shadow 看着 1 px 偏移 → 我擅自把 ts triple shadow 改 single 是错的,sdlpal text.c:1144-1155 真值是 triple(注释明说 DOS triple / WIN95 single,sdlpal "fix" 统一 triple)— **不能因截图视觉差就改算法**,要改 font / palette 对齐才行。user 原话:"你不是对着截图改,我截图给你**发现问题用的**,你的修改都要在 sdl 里面找到出处再改"。

## 反 shallow 资源 / 真值判断(硬约束)

判断"M4 是否已 dump X" / "sdlpal `(cond ? A : B)` 真值哪个" / "pal-extract parser 完整覆盖 Y" 前,**必走 byte-level / source-level verify**,不许凭 surface 信号(file naming / macro 字面 / category 字段名)推断:

1. **"M4 是否已 dump X"**:必走 — `grep -n X packages/pal-extract/src/cli.ts` + **追 parser 实现源码**(`parsers/*.ts` / `resources/*.ts`)看 dump-all vs 选 subset + 对照 `data/extracted/` 实际文件数 vs MKF chunk_count。不许 `find -name "X*"` 0 hit 当"没提取"证据 — extracted/ 按用途组织(eg. FBP 全 chunk routed 到 `battle/bg/`),不按 MKF 源文件名。
2. **sdlpal `(cond ? A : B)` 三元**:必走 — `grep cond` 在 `reference/sdlpal/` C source / header 拿 cond 实际取值;**区分编译宏**(eg. `#define PAL_CLASSIC`)**与 runtime 检测变量**(eg. `fIsWIN95` 由 `global.c:50-109 PAL_IsWINVersion` 自动检测)— 不同维度不许混。
3. **资源 audit doc 自己也得真**:不许只看 cli.ts 调用就标"全 dump"。**必须追 parser 实现**(`parseWordDat` 只 dump 5/7 category 是 2026-05-27 真案例,漏 55 条 sys/UI label)。任何"全 dump" / "覆盖 Y" 断言,必须有 chunk_count vs output_entries 数字对比。
4. **sdlpal 真值 vs 用户起手 msg 冲突**:立刻 grep sdlpal 验 + **问用户**,不擅自二选一。
5. **WORD.DAT label 字符串**:用户提的菜单文案若跟 sdlpal `PAL_GetWord(N)` 引用相关,必先 `xxd data/raw/WORD.DAT` + GBK decode id N(10 byte/word fixed)拿真值,不许凭通用翻译猜(eg. "新游戏" vs sdlpal id 7 真值"新的故事")。

> Why:2026-05-27 M5.6 v2 session 2 T17 准备阶段连续 4 次 shallow-推被 user 怒怼(FBP 没 extract → 实际全 dump / chunk 60 vs 002 / OpeningMenu 3 项 vs sdlpal 2 项 / WORD.DAT 漏 55 条 / "新游戏" vs "新的故事")。共同 root cause:用 surface 信号代替 byte-level / source-level verify。
> 详 audit doc:[docs/plans/2026-05-27-m4-extract-audit.md](docs/plans/2026-05-27-m4-extract-audit.md)

## Commit 节奏

- **每完成一个功能 commit 一次**,不堆改动。一次 git checkout 把未提交工作 wipe 是真实存在的事故。
- commit message 写 sdlpal 真值出处(`script.c:行号` / `scene.c:行号` 等),便于回溯。
