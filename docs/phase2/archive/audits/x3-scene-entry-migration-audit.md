# X3-1 场景入场迁移审计

> 日期:2026-07-15
> 产物:`projects/pal`
> 自动门禁:`packages/migrate/src/scene-entry-product.test.ts`

## 结论

PAL 原始 `ditherScreen` 站点按“是否属于 onEnter，以及是否出现在安全同步前缀后”分成
三组。迁移器只提升第一组，后两组仍保留通用 `ditherScreen` 命令。

### 显式入场提升:11 场景

`s001 / s018 / s057 / s090 / s151 / s180 / s182 / s196 / s197 / s198 / s200`

- 10 个是 `root/on-enter/stage-0`。
- 唯一 override 是 `scene/s182/override/on-enter/L-27448/stage-0`。安装该 override 的
  `setSceneOnEnter` 命令物理位于 `scene/s188` 分片，但目标场景和稳定脚本 id 均是 `s182`；
  不能用容器文件名猜目标场景。
- `s001` 精确提升为 `prepare=[playMusic(31), teleportParty(59,-23)]`、
  `reveal=dither(2160ms)`，body 第一条为李大娘对话。
- `s151` 的第一个早期 dither 已提升，同一 body 后续仍有两个剧情 dither；“场景已提升”
  不等于删除场景中所有逐像素特效。

### 独立站点反例:17 场景

`s011 / s020 / s058 / s059 / s064 / s138 / s144 / s146 / s147 / s148 / s154 / s163 / s201 /
s250 / s252 / s278 / s281`

这些站点在实体 trigger 或剧情编舞脚本中，以当前 presented frame 为 source，不是场景入场契约。

### onEnter 非早期反例:13 场景

`s140 / s142 / s164 / s169 / s170 / s171 / s173 / s183 / s188 / s203 / s227 / s233 / s251`

这些 onEnter 在 dither 前已有非安全前缀，例如 `setActorSprite`、等待、对话或长演出。
lifting 遇到第一个 blocked 命令即 fail-closed，不跨分支、不穿透调用、不猜执行路径。

## 安全与边界

- `SCENE_ENTRY_PREPARE_SAFETY` 使用 `satisfies Record<Command['kind'], ...>` 穷尽命令联合。
  validator 和 migrate lifting 共用该唯一分类源。
- root onEnter 与 `setSceneOnEnter` override 独立扫描。运行时只读当前活动 stage 的
  `entry` 元数据，不扫 body，不预读脚本分片。
- 历史 `DETERMINISTIC_PREFIX_KINDS`、`hasEarlyDitherScreen` 与 `bindingHasEarlyDither`
  已删除，实现包零引用。
- dither 的 72 步、工程级假色 profile、source/target 像素算法和 2160ms 开场时长均未改动。

## MG2 迁移门禁

2026-07-15 完整 PAL 迁移结果:

- 829 个内容文件，294 个场景，297 个脚本分片。
- 体积比:`compact/all.json = 1.65x`、`pretty/all.json = 1.13x`、`commands/all.json = 1.53x`。
- 第一次写入事务 47 个操作；迁移命令自带的第二次运行为
  `writes=0 / deletes=0 / conflicts=0`。
- 294 个场景校验通过，`warnings=0 / issues=0`。

## 回归门禁

- `scene-entry.test.ts`:纯 lifting 规则，覆盖成功提升、分支/调用/等待阻断和已有 entry。
- `migrate-content.test.ts`:`s001` 真实迁移集成，断言准备参数、呈现和正文边界。
- `scene-entry-product.test.ts`:直接读取提交的 `projects/pal`，精确断言 11/17/13 三组清单、
  s182 override 稳定 id 和 s001 开场参数。
