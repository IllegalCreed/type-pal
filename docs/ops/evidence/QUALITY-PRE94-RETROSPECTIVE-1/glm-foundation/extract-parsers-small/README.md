# extract parsers 小件四文件复审（glm-foundation 模块 3 批 4）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本页审计主题:pal-extract 的 resources/parsers/{rix,sounds,rng-frames,data-misc}.ts(16/29/36/102 行)复审;基点 53db76bbbb5729ba8bc6525bd7ad2ad4bb425c02 线。原文 Status: review(候选待 Codex 据证验收)。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收;可复用范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 范围与证据

改动 2 处仅注释。验证证据:body-invariance(同目录)四文件一致;定向 4 文件断言 34/34(directed.json,含真盘 SDLPal RGBA 对拍:DATA chunk9/10、RGM 92 chunks、BALL 252、FIRE 837 帧、RNG 12 chunks;首跑 6 fail/3 skip 为 worktree 缺盘环境失败,补链五盘后全绿,两态如实记录);scoped biome 0/0/0;diff --check 干净。未跑全仓门。

## 发现

整改逐项:①rix.ts 『keep sparse script track IDs』笔误(RIX 是曲库无脚本)改为『sparse track IDs (skip empty chunks)』;②sounds.ts 『runtime 音频系统接入留 M6』过时——已核实 game audio.ts:9,53 按 /extracted/sounds/{id}.wav 经 decodeAudioData 直接消费 RIFF(RIX 另走 audio-rix worklet),按现状改写。八维要点:rix 空 chunk 跳过+RIX 头(0xAA55/≥16B)校验 throw 产稀疏曲目表;sounds 纯 metadata 投影(505=363+142 实测自洽);rng-frames shared 解码+PNG 薄封装;data-misc 三 parser 均 sdlpal 锚(chunk 6/11/14 布局)。登记:截断容忍族(parseLevelUpExp Math.min(100,…)、parseLevelUpMagic 短输入返[]、parseBattleEffectIndex 奇数字节静默舍)——真实 chunk 尺寸固定,O-2 族;data-misc 本地 LevelUpMagicEntry 与 shared/tables.ts 同名同形类型并存(统一属接口变化,Codex 裁定);decodeRngAnim 生产 0 消费(头注已自述供历史/测试用,测试消费中)。

## 结论

注释整改批(2 处):断言级 34/34 绿+body-invariance 四文件 AST 一致。但 tables.test.ts 套件当时因缺 WORD.DAT 加载失败(0 断言,suite-status=failed,回执内可查),34 为其余三文件计数;补链 WORD.DAT 后 tables 全量 89/89 已在批 6 回执实测通过;两态均保留,不以勘误改写原数字。

## 整改与复核

Codex 2026-10-19 接管:本片原 tables 加载失败保持,不作为整门通过;后续 extract-spells-teams-items 的 89/89 原生报告只恢复 tables.ts 套件本身,不能据其补 word.test.ts 信用,word 另由 Codex 当前 8 例恢复;历史缺 console 的静态/运行时零诊断不补造。Codex 2026-10-20 剩余29文件返工:本片 34 例原件并未运行 rix/sounds 直接测试,不能给两文件直接测试信用;Codex 现补两文件 4+1=5 例,0 stderr;旧 tables 加载失败保持,不改写历史。逐文件八维、原件与限制见 [codex-final29.json](../codex-final29.json);本节不接收原文整包/模块收口宣称。复验入口(原页给出,此处概述):git log 对四文件;prove-body-invariance.mjs --base 53db76bb…;定向跑 data-misc/misc-mkf/rng-frames/tables 四测试(真盘用例需 DATA/RGM/BALL/FIRE/RNG 软链)。本轮治理未重跑任何命令;候选待 Owner 接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4627B / SHA-256 326b77499d1d3f40cdd5d81ab12357d9bad47f6a3f9c892d7004611fa5f9457a；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# extract parsers 小件四文件复审（glm-foundation 模块 3 批 4）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbbb5729ba8bc6525bd7ad2ad4bb425c02` 线
范围：`resources/parsers/{rix,sounds,rng-frames,data-misc}.ts`（16/29/36/102 行）。开工核对无 Owner 冲突；本轮 fetch 一次 SSL 瞬断（origin 仍 53db76bbb，自有线不受影响，模块收口重试）。

## 短回执

- **改动 2 处（仅注释）**：①rix.ts "keep sparse **script** track IDs" 笔误（RIX 是曲库无脚本）→ "sparse track IDs (skip empty chunks)" ②sounds.ts "runtime 音频系统接入留 M6" 过时——已核实 game `audio.ts:9,53` 按 `/extracted/sounds/{id}.wav` 经 decodeAudioData 直接消费 RIFF（RIX 另走 audio-rix worklet），按现状改写。
- **验证**：body-invariance 四文件一致；定向 4 文件 **34/34**（含**真盘 SDLPal RGBA 对拍**：DATA chunk9/10、RGM 92 chunks、BALL 252、FIRE 837 帧、RNG 12 chunks——首跑 6 fail/3 skip 均为我 worktree 缺盘的环境失败，补链 DATA/RGM/BALL/FIRE/RNG 五盘后全绿，两态如实记录）；scoped biome 0/0/0；diff --check 干净。未跑全仓门。

## 八维结论

| 维 | 结论要点 |
|---|---|
| A | rix：空 chunk 跳过 + RIX 头（0xAA55/≥16B）校验 throw，产稀疏曲目表。sounds：纯 metadata 投影（505=363+142 实测自洽）。rng-frames：shared 解码 + PNG 薄封装。data-misc：三 parser 均 sdlpal 锚（chunk 6/11/14 布局）；**登记**：截断容忍族（parseLevelUpExp Math.min(100,…)、parseLevelUpMagic 短输入返 []、parseBattleEffectIndex 奇数字节静默舍）——真实 chunk 尺寸固定，O-2 族。无新直接缺陷。 |
| B | 本批修 2 处（rix 笔误、sounds 过时接入状态）。data-misc 头部"跳过 7/8/9/10/12"清单准确。 |
| C/D | rix/sounds/data-misc 单向依赖 io/mkf 或纯投影；rng-frames→shared/sprite 复用不重复解码。**登记**：data-misc 本地 `LevelUpMagicEntry` 与 shared/tables.ts 同名同形类型并存（parser 返回 DTO vs 公共表类型）——统一属接口变化，Codex 裁定。 |
| E | 34 例含 C2 期真盘 native RGBA oracle（本批实测复跑通过）。 |
| F/G/H | 清楚；**登记**：`decodeRngAnim` 生产 0 消费（头注已自述"供历史/测试用"，测试消费中）——保留，退役另裁。 |

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
git -C "$WT" log --oneline 53db76bbb..HEAD -- packages/pal-extract/src/resources/parsers
node "$WT/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/prove-body-invariance.mjs" \
  --base 53db76bbbb5729ba8bc6525bd7ad2ad4bb425c02 packages/pal-extract/src/resources/parsers/rix.ts \
  packages/pal-extract/src/resources/parsers/sounds.ts packages/pal-extract/src/resources/parsers/rng-frames.ts \
  packages/pal-extract/src/resources/parsers/data-misc.ts
cd "$WT/packages/pal-extract" && ../../node_modules/.bin/vitest run src/resources/parsers/__tests__/data-misc.test.ts \
  src/resources/parsers/__tests__/misc-mkf.test.ts src/resources/parsers/rng-frames.test.ts src/resources/tables.test.ts
# 真盘用例需 data/raw/{DATA,RGM,BALL,FIRE,RNG}.MKF 软链
```

失效条件：四文件实现变化 → 重证；DATA/RIX 布局或 game 音频消费方式变化 → 对应注释复核。

## 勘误（2026-10-18 晚补）

本批"34/34"未披露:**tables.test.ts 套件当时因缺 WORD.DAT 加载失败(0 断言,suite-status=failed,回执内可查)**,34 为其余三文件计数。补链 WORD.DAT 后 tables 全量 **89/89** 已在批 6 回执中实测通过;两态均保留,不以本节改写原数字。


## Codex当前勘误与接管（2026-10-19）

本片原tables加载失败保持，不作为整门通过。后续extract-spells-teams-items的89/89原生报告只恢复tables.ts套件本身；不能据其补word.test.ts信用，word另由Codex当前8例恢复。历史缺console的静态/运行时零诊断不补造。 [当前返工与限制](../codex-stage2-rework.json)。


## Codex 剩余29文件返工（2026-10-20）

本片34例原件并未运行rix/sounds直接测试，不能给两文件直接测试信用；Codex现补两文件4+1=5例，0stderr。旧tables加载失败保持，不改写历史。

逐文件八维、原件与限制见[本轮回执](../codex-final29.json)。本节不接收原文整包/模块收口宣称。
````
<!-- incremental-original-source:end -->
