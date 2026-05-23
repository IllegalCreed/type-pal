# sdlpal patches

集中存放 type-pal 给 sdlpal 上游应用的 patch。**不修改 sdlpal 源码本身**,以便 sdlpal 上游可更新。

patch 路径均相对 sdlpal 根目录(以 `a/<file>` / `b/<file>` 起头),应用方式为 `patch -p1 -d <sdlpal-copy>`。

## patches 列表

- `pal-classic-on.patch` —— 强制打开 `common.h` 里的 `#define PAL_CLASSIC 1`(去掉 `#ifndef ENABLE_REVISIED_BATTLE` 包裹),build 出 1995/1998 原版 battle 行为(D30,纯回合制非 ATB)。`scripts/build-sdlpal-classic.sh` 应用此 patch。
- `headless-map-dump.patch` —— 给 sdlpal 加 `--dump-map N --out FILE` CLI,跳 SDL 窗口 dump 全图 PNG(D29 视觉基准)。M3 Task 2 加。
- `headless-battle-harness.patch` —— 给 sdlpal classic build 加 `--battle-harness FIXTURE --out-battle RESULT` CLI,从 KV-text fixture 跑确定性战斗 dump 每回合 JSON(D29 数值基准)。M3 Task 10 加。改动 5 个文件:
  - `util.h` / `util.c`:加 `PAL_HarnessSetRandomSeed(seed)` 控制 `glSeed`(原 static),让 RNG 跨进程可复现
  - `main.c`:加 `--battle-harness`/`--out-battle` CLI 解析,启用时强制 `SDL_VIDEODRIVER=dummy`/`SDL_AUDIODRIVER=dummy`(无窗口无声音)
  - `fight.c`:在 `PAL_BattleStartFrame` PAL_CLASSIC 路径加 3 个 hook 点 —— `PAL_HarnessFillTurnActions`(替代 select-action UI)、`PAL_HarnessOnTurnEnd`(每回合末 dump)、加 win/lose 早返回前的兜底 dump
  - `battle.c`:加 `PAL_HarnessRunFromFixture` 实现 —— KV parser、PlayerRoles 覆盖、party 组装、RNG seed、result JSON 写入(header + turns 数组 + footer)

注:`scripts/sdlpal-extern-c.patch`(M1,macOS SDL3 链接修)留原位不迁移,`scripts/build-sdlpal*.sh` 同时引用。

## Result JSON 约定(headless-battle-harness)

`build/sdlpal-baseline/battles/<fixture>-result.json` 由 `headless-battle-harness.patch` 写出,M3 战斗系统(T12+)按字节级对拍。

- 每个 `turns[i].enemies[j]` 含 `{objectId, hp}`。
- **死敌识别**:`objectId === 0`(sdlpal 在敌人死亡瞬间把 `wObjectID` 清成 sentinel)。此时 `hp` 是 `wHealth` uint16 underflow 残留值(常见 `65504`),**不是** `0`。
- TS oracle 对拍时应按 `objectId === 0` 跳过死敌,不要按 `hp <= 0` 判定。

## 用法

不要手动 apply。`scripts/build-sdlpal*.sh` 走 copy → patch 流,patch 只动 `build/sdlpal*/`,`reference/sdlpal/` 源树始终干净。

## 生成新 patch

```bash
cd reference/sdlpal
cp <file> /tmp/<file>.bak
# 改 <file>
diff -u --label "a/<file>" --label "b/<file>" /tmp/<file>.bak <file> > patches/<name>.patch
cp /tmp/<file>.bak <file>  # 还原源
```
