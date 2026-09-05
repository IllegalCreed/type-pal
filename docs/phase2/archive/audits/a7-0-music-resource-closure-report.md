# A7-0 音乐资源闭包报告

> 日期:2026-07-15  
> 范围:音乐 MIDI、MIDI soundfont、音乐引用、编辑器生命周期、PAL 迁移与 MG2 所有权。  
> 结论:音乐族闭包通过；A7 全资源闭包仍未完成。

## 1. 单一链路

```text
SceneDef / Command / WorldState 中的 AssetId
  -> manifest.assets.catalog / roles
  -> assets/index.json 的 AssetRecord
  -> AssetResolver
  -> 当前工程 FileSource
  -> MIDI / soundfont 字节
```

- `content/music.json` 已删除，AssetId 不推导路径。
- `musicId/battleMusicId` 和数字 0 停曲哨兵已退出最终 content；停曲使用 `stopMusic` 或字段 `null`。
- MIDI worklet 是应用壳；MIDI 与 soundfont 是工程资源。HTTP、FSA、游戏运行和编辑器试听不再各建解析器。
- 旧 v2 仅能在项目打开/迁移边界单向升级；v3 内存和保存产物没有双格式。

## 2. 文件闭包

| 项目 | 数量 | 字节 |
|---|---:|---:|
| MIDI (`kind=music`) | 86 | 767,426 |
| soundfont (`kind=soundfont`) | 1 | 5,969,788 |
| 合计 | 87 | 6,737,214 |

- 86 个 MIDI 的来源为 `data/extracted/music/001.mid` 至 `087.mid`，缺 029；工程目标为
  `assets/migrated/music/NNN.mid`。
- soundfont 目标为 `assets/runtime/soundfont.sf3`，角色为 `audio.midiSoundfont`。
- 物化阶段对 87 个目标逐个检查存在性、登记 bytes 和 SHA-256；本轮错误数为 0。
- catalog 来源统计：86 个 `legacy-migrated`，1 个 `licensed`。受保护二进制不进入 git JSON baseline，
  但本地迁移可确定性重建。

## 3. 引用闭包

权威扫描对象是最终迁移文件，不按文本行数或只扫顶层命令：

| 引用/语义 | 数量 |
|---|---:|
| `playMusic` | 1,174 |
| `stopMusic` | 53 |
| 旧语义站点合计 | 1,227 |
| `SceneDef.music` | 36 |
| `SceneDef.battleMusic` | 81 |
| 显式 `startBattle.music` | 31 |
| 唯一音乐 AssetId | 71 |
| 缺失音乐 AssetId | 0 |
| 旧 `musicId/battleMusicId` 键 | 0 |
| 泄漏 `overrideSceneBattle` 标记 | 0 |

完整 typed walker 共收集 1,327 条资产引用，错误为 0。12 个 catalog 曲目目前未被引用，按规则只报
`unused-asset` warning；它们仍是有效工程资源，不能由迁移器或编辑器静默删除。

静态表在实现前只显示 80 个战斗音乐槽。迁移时发现动态 `setSceneOnEnter` 根曾绕过正常 finalize，导致
s106 的内部 battle 配置标记泄漏；修复后该根先剥离标记并把曲目 37 烘回场景，最终权威数为 81。

## 4. 运行与编辑闭环

- reforge 的 BGM player 只接受 AssetId，五个具名角色分别承载 soundfont、默认战斗曲、首领胜利曲、
  普通胜利曲和标题菜单音乐。`audio.openingMenuMusic` 在 PAL 工程绑定 `music.pal.004`，只在“新的故事 /
  旧的回忆”标题菜单显示期间播放，不写入 `WorldState.audio.currentMusic`。
- `AssetResolver` 校验 id/kind/path；同一资源 URL 复用，工程切换或 dispose 后统一 revoke。
- 编辑器“资源 -> 音乐”显示 86 首的名称、AssetId 和路径；导入/改名/替换/删除均走 Command。
  导入与替换写入 `assets/authored/<sha256>.mid`，替换保留 AssetId。
- 引用中的资源禁删，未引用资源可删；场景、脚本和共享脚本选择器均从同一 catalog 派生。
- 6010 浏览器实测两首 MIDI 可依次试听且保持单路；临时改名进入 undo，撤销后恢复；页面无资源错误提示。
- 本地 v2 -> v3 集成测试覆盖旧别名、引用、MIDI 字节、soundfont、manifest 最后写入和旧
  `content/music.json` 删除。catalog/blob serialize-reload 与 FSA URL dispose 有独立测试。

## 5. 迁移与所有权

- `assets/migrated/**` 归迁移器，`assets/authored/**` 归作者，`assets/runtime/**` 保存授权运行资源。
- MG2 对 catalog 采用 AssetId-keyed 合并与专用所有权校验。作者接管同一 AssetId 后，迁移器不能向其记录
  拼入 migrated 字段；迁移兄弟记录仍可正常更新和新增。
- 正式写盘后重新读取源数据再生成；最终 dry-run 为 `writes=0 deletes=0 conflicts=0`。
- 最终 PAL 迁移规模：829 个托管 JSON 文件、294 个场景、297 个脚本 chunk；资产引用门禁 1,327 条，
  缺引用/kind mismatch 为 0。

### A7-0A 勘误（2026-07-16）

A7-0 最初把“现有 Reforge 播放站点只有四种角色”误当成完整需求证明，因而漏掉了尚未实现的标题菜单音乐。
反查一阶段全部 `wNumMusic` 赋值后确认：交互式标题菜单使用 track 4，splash 使用的 track 5 不属于本角色。
本次新增第五个封闭角色并修复删除保护；教训是“扫描现实现站点”只能描述现状，不能发现整段漏实现的需求。

## 6. 未闭合范围

A7-0 不能把 A7/R7 整体标成完成。以下仍是明确债务：

1. A7-1：SFX 与角色/敌人/技能音效的 AssetId、导入替换和运行链。
2. A7-2：头像、物品图标、战场图、UI、字形与唯一颜色表，清除 `/baked`、`/ui` 旁路。
3. A7-3：瓦片、精灵、战斗/法术动画、RNG、视频，清除数字/path 双轨。
4. A7-4：克隆/另存/ZIP 只按 catalog 闭包枚举，legacy 归零并升级 v4；断开仓库资源目录做最终验收。

这些缺口必须继续由全量闭包报告呈现，不得用 allowlist 或 silent fallback 报绿。
