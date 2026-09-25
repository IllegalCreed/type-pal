# DOC-CURSOR-1 — Codex独立接收复核

## 后续收口（2026-09-25）

本报告所接收的 Cursor 回执 `320800ec` 已在 main 与原候选逐字一致；五份指南修订和 H7 真实 UI 核对均由后续卡分别完成。按当前“审过即集成推送”规则，Codex 将本只读材料卡归档 done；下方“未合 main/不标 done”仅为当轮历史状态，不表示现有阻断。

日期：2026-09-25。当前候选正文`65193a84`，登记tip`320800ec`；证据冻结`a3ceaf05`。
首轮正文`650f9f9d` / tip`8f3b85a7`的反证保留在下方历史节。
原[Cursor回执](cursor-docs-hygiene.md)保持原文。本报告是Codex自己的判断，不改写贡献者结论。
复核位于独立分支`codex/doc-cursor-review-r1`，不合main，不改十二份源文档或产品，不标done。

## 结论

**accept（仅审计材料接收）：CR-1/CR-2已闭，无剩余返工项。** H1～H6不重开，H7保持待核，
T1删除旧URL括号，N1纠正参数转发。此accept不是正式文档修复、产品验收或done准入。
后续[五份文档修订草案](../ops/archive/tasks/done/DOC-GUIDE-REVISION-1-current-entrypoints.md)另核，仍draft/not opened。（本句为当时记录；该修订卡随后已集成收口。）

## 窄返工复核 — 65193a84 / 320800ec

- CR-1：已撤销用ScriptTree证明当前提示/按钮的结论，真实调用链与前轮源码反证一致；
  H7分类为待确认，未给出未经验证的替换句，scene-entry-authoring仍不进机械修订范围。
- CR-2：N1已明确多余`--`会进入argv并被拒；README/content-publication正确短写保持，
  dev-servers两处列需删除分隔符。回执明确引用Codex隔离反证，不冒称Cursor跑过真实迁移。
- T1已收敛为直接删旧URL括号，不产生URL仍可用或世界自动恢复的承诺。
- 机械核对H1～H6六行与8f3b85a7逐字一致；12个问题ID唯一，小计确为
  8条确定不符（H1～H6/T1/N1）、1条待核（H7）、3条保持（N2～N4）。这是建议分类，不是8个产品bug。
- `26c4ae5c..320800ec`仍恰一份回执；登记提交只回填候选SHA和检查结果，正文候选为65193a84。
  五个关键源码锚点与a3ceaf05逐字一致；packages/scripts、十二份源文档未改。
- 候选原树文档检查exit0（545 Markdown / 2975 links / 179 tasks）；候选diff检查exit0。
  不重复跑已核argv实验或其它已闭项，不跑产品测试/覆盖率/浏览器/迁移。
- 两个回执提交原样cherry-pick到独立复核分支为7d33c7ac/0508bc2a；没有合入main，
  没有改Cursor的回执措辞。仅Codex接收席位签accept，他席与任务Status均不变。

## 已接收项与修订决定

| 项 | 独立证据（a3ceaf05） | 决定 |
|---|---|---|
| H1 | `packages/game/package.json:6-11`无e2e脚本；`7aeef72ff`确实删掉Playwright树及脚本；`vite.config.ts:9,84-86`仍认E2E环境变量 | 删除指南6001/e2e脚本入口；保留`E2E=1`禁SSL路径，不把它等同Playwright仍可用 |
| H2 | `packages/reforge/src/main.ts:267-268`显式拒skill URL；`main.boot-flows.test.ts:61-80`钉旧链；`debug-tools.ts:1280-1288`仍调用grantSkill | 两处URL清单去掉skill；区分普通调试命令与隔离战斗模拟器，不宣称普通调试命令也隔离存档 |
| H3 | `.gitignore:65-66`只忽略migrated/runtime；`git ls-files 'projects/pal/assets/**'`仅index.json；`pal-assets.ts:999-1027`声明迁移音乐/音源等路径；`asset-resolver.ts:41-46`按catalog.path读source；能力表A7已done | 删除旧五族fallback描述，精确列ignored二进制子目录与已入库index；不修改任何资源 |
| H4 | 根package.json的bake转发到migrate；`packages/migrate/scripts/bake-assets.mts:13-16,177-179`目标是engine-chrome；整文件写出均在CHROME/UI派生路径 | bake移到维护者单独说明，明确不物化PAL工程；不删命令本身 |
| H5 | 对`editor-navigation.ts`的真实AST抽取：九模块，simulator四页，map/item/battle/asset子页确有文档遗漏；`editor-navigation.test.ts:19`登记九模块 | 按注册表标签同步模块表及左栏说明，project标签为项目设置；不碰设计草图和其它架构合同 |
| H6 | `main.ts:4489`定义runDetachedScriptChain，`:6081`实注入runDetached；现行源码无runDetachedV5ScriptChain | 替换过时符号引用；不借符号更名改其它detached行为描述 |
| T1 | `main.ts:6105-6114`普通面板直接授技，队内目标maxMP至少999并补满；旧skill URL在boot入口被拒 | 直接删“（?skill语义）”，不改成任何URL仍可用或自动恢复世界的承诺 |

H5注册表静态抽取结果：场景→场景编排/氛围；地图→地图编辑/瓦片集/组合库；剧情→脚本库/变量/指令手册；
角色→角色编辑；物品→物品/炼蛊皿/紫金葫芦/商店；战斗→技能/敌人/敌队/毒/战场；
战斗模拟器→试打方案/我方预设/敌方预设/背包预设；资源→精灵库/图像/音乐/音效/过场素材；
项目设置→概览/全局资源与启动/入口与开局/问题。未运行UI，不将静态结果写成视觉验收。

## 首轮CR-1（现已闭合）：H7引用的是未在当前页面渲染的组件

`ScriptTree.tsx:673`确有“默认淡出 → 切场 → 淡入”，但**字符串存在不证明当前界面显示它**。
真实调用链是：

1. `App.tsx:3200`渲染CanonicalSceneScriptWorkspace。
2. `SceneScriptWorkspace.tsx:317`渲染ScriptSceneHookInspector。
3. `ScriptSceneHookInspector.tsx:19-26,185`导入/渲染CanonicalScriptFlowEditor。
4. `ScriptEditor.tsx:3985-4032`传stage.entry?.prepare给CanonicalFlowBodyTabs。
5. `ScriptEditor.tsx:3742-3753`在prepare缺席时直接渲染正文编辑器；存在时`:3755-3785`显示
   “画面出现前 / 脚本正文”，不是H7所引的默认提示。

全packages查`ScriptTree`：组件实例仅在其测试中构造；生产ScriptEditor仅导入`describeScriptCommand`
工具（`:66`），不渲染ScriptTree。不能把文件被导入与该组件被渲染混为一谈。

要求：H7改为“现行UI证据不足/指南与当前调用域需另核”，撤销两句当前界面断言
（默认文案替换、恢复默认按钮仍一致）。可记录旧组件文字作为历史源码事实。
本次不要求浏览器复验、不实现入场呈现控件，也不宣布这是已经证实的产品回归；
`scene-entry-authoring.md`不进入这批机械修订白名单，后续由Codex结合实际可达UI核定。

## 首轮CR-2（现已闭合）：N1命令并不等价，多余分隔符会被拒绝

`packages/migrate/scripts/migrate-content.mts:44-51`对argv仅允许`--write`，其它参数throw；
`:53`才开始recoverMigrationTransaction。回执将`run migrate:content -- --write`称为
“等价更稳妥”并建议统一到此写法，是反向建议。

Codex在`/tmp/type-pal-doc-argv.UUSph2`建立无依赖临时包，先用纯Node捕获argv，随后使用仓内真实tsx
再捕获argv，并**提取真实迁移CLI参数校验片段到VM执行**；没有import迁移模块、recover、生成或发布IO。
Node v22.23.2 / pnpm 10.29.2，子进程移除NODE_COMPILE_CACHE。临时script名为probe-tsx，
script值为仓内tsx绝对路径加probe.mts：

| 临时无写盘命令 | tsx脚本实际argv | 真实参数门结果 |
|---|---|---|
| `pnpm probe-tsx --write` | `["--write"]` | exit0 |
| `pnpm run probe-tsx --write` | `["--write"]` | exit0 |
| `pnpm run probe-tsx -- --write` | `["--","--write"]` | exit1，`未知参数: --` |

probe.mts核心可重建如下（只提取校验段，repo指冻结树；临时package.json给probe-tsx配置真实tsx）：

```ts
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
const repo = '/Users/zhangxu/illegal/type-pal'
const cli = readFileSync(`${repo}/packages/migrate/scripts/migrate-content.mts`, 'utf8')
const start = cli.indexOf('const args = new Set(process.argv.slice(2))')
const end = cli.indexOf('\nrecoverMigrationTransaction(repo)', start)
if (start < 0 || end < start) throw new Error('argument gate markers missing')
console.log(JSON.stringify({ argv: process.argv.slice(2) }))
runInNewContext(cli.slice(start, end), { process: { argv: [...process.argv] }, console })
```

要求：N1不再归“两个都可用”；README/content-publication的短写本来正确，保持。
将`dev-servers.md:18,104`的错误分隔符列为需修订项，推荐`pnpm --filter @type-pal/migrate run migrate:content --write`。
不执行真实write/dry-run来证明命令；CLI默认路径也会先调用recover，不当作绝对无IO的验证手段。

## 首轮范围与验证（历史）

- 远端tip核为`8f3b85a7d1e9825eac8f85b6938b436409e2e9f2`；650f正文→8f登记仅增一条SHA。
- `git diff --name-status 26c4ae5c..8f3b85a7`恰一文件；生产/scripts对a3ceaf05零diff。
- 十二份源文档a3ceaf05→候选零diff，未拿较新文本冒充冻结证据。
- 候选原树`node scripts/docs/check.mjs`exit0（545 Markdown / 2975 links / 179 tasks），
  `git diff --check 26c4ae5c..8f3b85a7`exit0；上述argv三态独立复验。
- N2时点统计、N3设计草图、N4面板命令本身保持不改。本复核不升级为全仓事实审计。
- 未启动服务、浏览器、测试或覆盖率；未运行迁移/提取/发布；未重签他席、未标done。

## 下一步

Cursor本包无剩余返工。五份修订卡的准入另核，没有“回执接收=正式指南已修复”的隐式推进。
无下一位Agent提示词，等待用户决定后续修订准入；不合main、不代签、不标done。
