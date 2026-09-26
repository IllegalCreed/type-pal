# D1 第一阶段依赖环拆分

2026-09-26，基点 `4cdefcf1`，属于 [ARCH-CONTINUATION-1](../ops/tasks/ARCH-CONTINUATION-1-remaining-queue.md)。Coding Owner/验证者均为Codex，按用户架构治理授权执行；不冒充其它Agent独立审查。

## 边界与前提

原静态运行期环有七节点：event-system、scene-system、equip-effect、battle-opcodes、menu-driver、menu-mode、magic-script。环本身不是已证玩法bug，本批只解依赖，不重写opcode或公式。

| 原耦合 | 新的单一所有者 | 保持项 |
|---|---|---|
| 执行器保存全局命令/标签，其它执行器反向读取 | script-catalog | 同一输入数组及原地宝箱补正、标签重建、cursor override |
| 菜单调用事件模块的库存函数 | inventory-state | OBJECT id 0拒绝、qty=0给1、数量钳制与移除 |
| 装备/战斗通过事件模块查毒定义与改毒槽 | player-poison-state | 单一毒定义表、去重/首空槽、同步入口回调、按等级清除 |
| 事件/战斗读取装备派生值，而装备脚本反调事件执行器 | equipment-state | 同一GameState的base+效果层、Extra槽、行写入/卸装清理 |
| 对话历史反向依赖整个场景模块 | scene-identity | loadScene原时点同步写入，bootstrap旧setter保持同绑定 |
| 菜单tick与输入路由为push/pop互相引用 | menu-stack | 关闭只pop；恢复battle/event/explore仍由原tick时点决定 |

旧模块继续显式re-export原符号，不创建兼容wrapper或第二份缓存；新底层模块不反向依赖解释器。equipment runner仍可调用原event毒脚本入口，event只依赖被动equipment-state，所以是单向。未加await、懒加载或注册回调来隐藏循环。

一手约束：工程笔记§2.3的宝箱补正、§3.1双opcode解释器、§3.4同帧后续；机制文档的装备base+Σeffect、毒槽/level99与世界→战斗共用状态。原版数据/SDLPal不需要重新作产品裁决：本批不改变这些已落规则。最强替代解释是“模块初始化顺序有实际副作用，搬状态会分裂实例”；新旧入口身份、真实消费者链及全包PAL用例用于反驳，不能仅靠静态图判断。

## 可重建验证

[统一机账](phase1-dependency-refactor-evidence.json)保存D1/E2静态核验、源hash、测试、反控与质量门结果。

```bash
node docs/testing/phase1-dependency-refactor-audit.mjs
node docs/testing/phase1-dependency-refactor-mutants.mjs
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/game exec vitest run src/core/dependency-ownership.test.ts src/core/cross-module-boundaries.test.ts
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/game run typecheck
```

- 只读audit对七个旧入口的出口集合逐一全等：186/10/14/1/14/3/2；161个原函数体逐token核对，32个迁入下层。
- 只有两处明确等价路由：tickAutoScripts用同步getter取当前全局数组长度；loadScene用同步setter写原mapNum。其它函数体不改，注释与格式不参与token判定。inventory旧注释误称id0不跳过，已按原函数实际守卫纠正，行为未改。
- 擦除type-only后，game生产静态import/export图原唯一七节点SCC→零SCC。此结论不扩张为所有动态调用或全仓无环。
- 新增8项所有权回归，含同一函数绑定、命令数组身份/原地补正、cursor override、跨入口库存、底层catalog+毒表→原装备runner同步生效、卸装清理、地图身份→真实历史消费者、menu pop→tick续商店。连既有跨模块4项共12/12。
- 原七个定向测试文件554/554、typecheck通过；初验漏导入getGlobalLabelMap导致3红，修正后全部绿。初次临时搬移脚本把行尾注释包入调用括号的语法错误亦在typecheck中修正，未跳过或改断言。
- 三针隔离load变异：catalog偷偷复制数组、地图赋值丢失、毒入口回调不执行。正控8项；每针钉确切fullName/file、恰exit1、AssertionError、注入见证及产品hash不变。反控runner曾把正常栈帧runWithTimeout误判超时，已收窄为非栈帧实际错误文本，不降低运行超时拒绝条件。

## 统一门禁与接入

完整check **8678项exit0** → 官方ratchet **exit0** → 保护`8bf40b90`的单次strict-fast **8186项/654生产文件exit0**。三步串行、去除NODE_COMPILE_CACHE；未以重试多数放行。生产build通过（保留既有大chunk提示），新增脚本/改动文件Biome与docs/diff通过；全仓47 warnings/6 infos既有项未增。

原基线8165/644，本批E2新增13项、D1新增8项，原生产文件全部保留、新增10个下层模块。全仓语句61240/80619（75.96%）、分支43261/63176（68.48%）、函数11385/15036（75.72%）、行55132/70570（78.12%）；结构变化令行分母减少2，不称同分母纯补测提升。shared/pal-extract/migrate/reforge/editor五包完整基线对象逐字不变。

本批D1与E2由Codex核定**accept/该两项收口**，整体ARCH-CONTINUATION-1仍build、其它九项未完成。**不混入GLM r11四项拟接入副本或其基线**；r11继续独立复核分支，剩余视觉归GLM。

最小功能验证：独立`http://127.0.0.1:6006/?skip-intro=1`加载正式PAL提取资源，真实浏览器Escape开菜单→Return进入李逍遥状态页（体力150/150、真气100/100、武术35及装备可见）→Escape回到探索画面。页面无error日志；不读写用户存档，不以此证明剧情。临时标签及本人Vite进程已关闭，未触碰6010/6051。
不改SAVE8/content20、资产、生成工程、官方统计选择/超时/阈值；剧情E2E/full/Q1/Q2不借本批完成。
