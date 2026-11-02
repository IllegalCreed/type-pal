# @type-pal/game — 第一阶段浏览器运行时

第一阶段以忠实还原仙剑奇侠传的玩法与可见表现为目标；已发布版本的冻结不禁止修复缺陷或治理代码结构。允许在行为不漂移前提下拆模块、整理依赖；确认实现缺陷后以失败回归先红后绿修复，纯重构与行为修正分提交、分验证。原版机制争议按一手证据与用户裁决处理，不把已知缺陷固化为保真。

所有工作从 [AGENTS](../../AGENTS.md#操作与必读)选择规则，专题查[第一阶段索引](../../docs/phase1/README.md)。现代化引擎在 `@type-pal/reforge`；本页的原版保真与旧运行时结构不构成第二阶段架构合同。

## 开发与验证

命令在仓库根执行，实际脚本见[根 package.json](../../package.json)与[本包 package.json](package.json)。

```bash
pnpm --filter @type-pal/game dev       # 6005，strictPort；先探测，已有实例则复用
E2E=1 pnpm --filter @type-pal/game dev # HTTP 开发入口，跳过 basicSsl
pnpm --filter @type-pal/game typecheck
pnpm --filter @type-pal/game test
pnpm --filter @type-pal/game exec vitest run src/core/battle/__tests__/battle-system.test.ts
pnpm --filter @type-pal/game exec vitest run -t "name of test case"
pnpm extract                         # 从原始资源重建 data/extracted
pnpm check:docs                       # 文档与治理一致性
pnpm lint                            # error/warning/info 全零
pnpm test:quality-tools               # 质量门工具回归
pnpm check                           # 完整仓库检查，范围按开发流程安排
pnpm format                          # 仅格式化相对 HEAD 的改动文件
```

端口分配为 game 6005、editor 6010、reforge 6050 起，使用包内脚本并避开 6000 等浏览器不安全端口。`E2E=1` 不是 Playwright，也不代表真实 Service Worker；旧 Playwright L2、game 的 `e2e` 脚本和 6001 专用实例已退役。实际剧情执行按 [E2E 合同](../../docs/testing/e2e/contract.md)，跨包启动记录见[开发服务器指南](../../docs/engineering/guides/dev-servers.md)。

## 运行时结构

第一阶段协作包为 `@type-pal/shared`（共享类型）、`@type-pal/pal-extract`（资源与脚本提取）和 `@type-pal/game`（浏览器运行时）；这不是整个工作区的包数量。

| 关注点 | 代码位置与职责 |
|---|---|
| 绘制 | `src/present/`；320×200 的 8 位调色板索引 framebuffer，经 `flushToCanvas` 输出 canvas；`IndexedImage` 的索引和 opaque mask 在 blit 时着色，不能用普通图片显示替代 |
| 事件脚本 | `src/core/event-system.ts`；执行提取出的 `events/all.json` 字节码，提取器的 `events/` 负责反汇编/重编译 |
| 游戏核心 | `src/core/`；战斗、场景、状态、菜单和存档，场景资源经 `SceneAssetsCache` 按 mapNum 缓存 |
| 浏览器外壳 | `src/shell/`；bootstrap、rAF 主循环、MIDI 音频与 AVI/RNG/FBP/结局播放 |
| 开发工具 | `src/dev/`；面板通过 `import.meta.env.DEV` 限于开发环境 |

## 资源链与修复边界

`data/raw` 原始 MKF → pal-extract → `data/extracted`（JSON、索引图与事件字节码）。运行时从 `/extracted/...` 获取；当前 [Vite 配置](vite.config.ts)通过 `serveDir` 中间件在 dev/preview 中映射到 `data/extracted`，已不依赖旧 `public/extracted` 符号链接。提取产物被 Git 忽略、可再生成，不能手改产物掩盖真源问题。

提取/转码缺陷修提取器并重生成；原始脚本或资源本身的已证缺陷修在运行时加载层（如 `setGlobalEvents` patch），保持反汇编/重编译 roundtrip。不把原版数据改成补丁输出；迁移工程的上游修复与幂等规则另见 [Reforge 开工规则](../../docs/phase2/READ-FIRST.md)。

## 原版考证与来源边界

`reference/sdlpal/` 是只读参考实现，`script.c`、`fight.c`、`battle.c`、`scene.c`、`map.c`、`text.c`、`uigame.c` 可解释移植来源，但不能单凭 C 源宣称原版行为已验证。区分原版早期、原版后期、sdlpal 与本项目；涉及差异时保留具体来源和适用版本。

- MKF 中的原始脚本/表格可证明对应数据；提取结果须保持可往返关系。
- RPG 存档证明存储布局，不单独证明运行时读法。已有布局记录：PlayerRoles SoA 从 `0x250` 起，`maxHP[6]@0x250`、`maxMP[6]@0x25c`、`HP[6]@0x268`、`MP[6]@0x274`；按 roleId 而非队伍槽位索引。roleId 顺序为李逍遥、赵灵儿、林月如、巫后、阿奴、盖罗娇；`rgwName@0x220 = [36,37,38,40,39,41]`，不能用顺序词条误认 3/4。原记录用 `2.RPG` 对照新游戏默认值；使用前核当前输入版本。
- 旧考证记录指出 `PAL.EXE` 为启动器，`Pal.dll` 含 SSE2 浮点代码，属于现代重编译线索，不能当成 1995 二进制逻辑。数据不能裁定的行为须核实际原版运行及用户观察。
- 二进制工具旧记录为 `objdump -d data/raw/Pal.dll` 或 Python `pefile` + `capstone`（PE32、`CS_ARCH_X86` / `CS_MODE_32`）；构建与运行细节按[参考运行记录](../../docs/phase1/sdlpal-runbook.md)核当前环境。

本节承接[原根知识文件](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/CLAUDE.md)的已有记录，未重新验证原版二进制或实跑游戏；专题结论以[机制资料](../../docs/phase1/game-mechanics.md)和任务一手证据为准。

## 按症状查工程知识

[工程记录](../../docs/phase1/engineering-notes.md)保存案例、日期与定位过程；本表只给检索方向，旧修复和部署观察不自动代表当前实现状态。

| 症状或问题 | 查找主题 |
|---|---|
| 剧情、巡逻或吞键 | 调试方法论：`window.__tpgs`、真实门触发与 `tp_dump`；离线 harness 调真实 `tickAutoScripts`，与壳层对照；字段全零先核 `res.c` 装载回填 |
| opcode、相机、切场景或 fade | 双解释器覆盖、相对相机偏移、sceneLoading/needToFadeIn 两层、C 阻塞异步化的同帧后续、定时状态收尾责任 |
| 战斗动画、立绘、跟随者或接缝 | 逻辑 tick 与 present 拍频、真实多行分页、0x15 指定成员、coverage mask 补缝 |
| 场景号、地图层或乱码 | extracted 0-based 与 loadScene 操作数 1-based、独立地图换层、BIG5/GBK 的 PUA 修复与重提取 |
| 离线、缓存、音色或生产慢 | SW 的 Range/ready/waitUntil/cache/activate 边界、停服务验真离线、部署环境与带宽、TimGM6mb 用户选择 |

本地真 SW 需实际验证，HTTP 开发页不能代替构建产物；旧记录使用 `http://localhost` 服务 dist 避开自签证书注册限制，离线验证须停服务。BGM 沿用用户选择的 TimGM6mb，不凭“更大音色库”自行更换；历史 CDN 配置、域名和测速值使用前重新核实。
