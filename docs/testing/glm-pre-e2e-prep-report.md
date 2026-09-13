# GLM 并行审计准备：整批回执

工作包：[r1范围与44项检查表](glm-pre-e2e-prep.md)。执行者GLM，接收复核Codex。
D-01设计签字已按节点一另交 main（623c592f，premise verified + design agree，无 counter），不塞本报告。
**本报告为卡前只读取证，不是修复授权；分类不是修复状态，不把44项检查表报为44个缺陷。**

## 冻结树与实际范围（GLM填写）

- 分支/基点：`codex/glm-pre-e2e-prep`，worktree `/Users/zhangxu/illegal/type-pal-glm-prep`，基点 **59e03bdb**；最终 SHA 见交付行。
- packages 相对 10c84238 **零 diff**（`git diff 10c84238..59e03bdb -- packages` 为空）；10c84238..59e03bdb 间唯一非文档变化是主线自身的 `scripts/coverage/baseline.fast.json`（leave-guard 官方 ratchet 生成，非本分支改动）；本分支自身 commit（2525189d 的前序）只含 5 个白名单文件。原探针零改动；真实工程/浏览器零写；未跑全仓 check/coverage/ratchet（按工作包避让 Codex）。
- 环境适配（与业务突变分开记录）：①内存源缺席文件抛 `DOMException(rel,'NotFoundError')`（当前 loader save-state 合同，工作包预告陷阱，Codex reprobe 同口径）；②cache 探针 jsdom 提供 DOM、IntersectionObserver 立即进视口、canvas 2d 为**呈现边界替身**（不把 stub 输出当视觉事实，证据=读取计数/Promise 行为）；③fetch 全程禁用。probe 环境失败均不计产品缺陷。

## 复算入口与命令回执

```bash
# worktree /Users/zhangxu/illegal/type-pal-glm-prep @ codex/glm-pre-e2e-prep（59e03bdb 起）
node --import tsx docs/ops/audits/pre-e2e/probe-glm-history-prep.mjs    # exit 0
node --import tsx docs/ops/audits/pre-e2e/probe-glm-reference-prep.mjs  # exit 0
node --import tsx docs/ops/audits/pre-e2e/probe-glm-upload-prep.mjs     # exit 0
node --import tsx docs/ops/audits/pre-e2e/probe-glm-cache-prep.mjs      # exit 0
```

日志 `/tmp/glm-prep-evidence/{history,reference,upload,cache}.log`。过程失败（全部已修复、未改产品、未删证据）：
history：`.mjs` 不支持 `!` 非空断言×2、body 需合法命令对象（改 `{kind:'wait',ms:1}` 原探针同款）、G-H12 注入复原次序错×2；reference：hook 变体合法形状两轮（`{label,order,flow:{kind:'stages',initial,stages}}`）、selectSceneHooks 注入点需在 hook 流内（场景级 entry=`{pos,facing}`，场景级 stages 无编辑面→G-R06 发现）、隔离目标 hook-b/hook-c 判定错位×2；upload：catalog 键为 `def.asset` 非 id、共享须复用同一 asset 键、合成图需取调色板真实颜色否则量化同字节；cache：root URL 笔误、G-C03 需真实换记录（仅换 revision 字符串时下层按记录签名正确命中=0 读，不是缺陷）。

## 44项唯一ID总表（分类：reproduced 12 / covered 23 / risk 9 / blocked 0 / N/A 0 = 44）

### G-H 撤销与事务（reproduced 8 / covered 8）

| ID | 分类 | 证据（caller/正控/观察/归属） |
|---|---|---|
| G-H01 | reproduced | 探针（AST 抽取真实 App undo/redo + historyOwnerRef 启发式 App.tsx:1602-1617/1631-1653）：M/S/M 撤销 u2=[0,wait1]（应撤脚本却撤价格）；S/M/S u2=[10,[]]（连撤两次脚本）。归 D-01 |
| G-H02 | reproduced | P/M/S：u2=[20,[]]（M20 未撤、脚本已撤=拆半）、redo1=[10,[]] 半笔重做；协调器仅双顶接管（editor-history-coordinator.ts:44-52）。归 D-01 |
| G-H03 | reproduced | 四布局（P-first/mid/last、P-P）undo 轨迹全录于 log，无布局全对。归 D-01 |
| G-H04 | covered | census：`historyCoordinator.dispatch` 全 src 恰 7 处=ItemTab.tsx:1024/1152（物品私有脚本增删；一条 use 脚本模型 script-editor.ts:1929 起）、App.tsx:1785/1807/1812（场景族）、App.tsx:1893/2057（实体族）。无遗漏第 8 处 |
| G-H05 | covered | 场景创建/复制/删除配对 caller=App.tsx:1785-1817/1893-1904；共享依赖=双 session+receipt；commands.test.ts 114 项含场景族回归 |
| G-H06 | covered | 实体增删配对=App.tsx:2057/:1893 族；与 G-H04 同源完整 grep，无「只列示例」 |
| G-H07 | reproduced | 探针：脚本侧新提交后 main 单栈 redo=true（孤儿可重做，全局分支只清协调器自身 future）。归 D-01 |
| G-H08 | reproduced | 探针：语义相等但新引用的 dispatch（buyPrice 0→0）返回 true 且清 redo（redo()=false）——`next===previous` 引用比较挡不住等值新引用（edit-session.ts:191-193）；apply 失败对照：状态/redo 保留 ✔ |
| G-H09 | covered | markSaved/hydrate/discardRedo 区分有具名证据：project-leave-guard.test.ts:78/159；可计序信号=dispatch/undo/redo 的 historyVersion（edit-session.ts:199/252-302、script-editor.ts:1376）；hydrate 写 state 不增版本（edit-session.ts:509 起） |
| G-H10 | covered | 探针：同 Command 对象两次 dispatch 按引用入栈两次各撤一次；同对象 pair 重复不炸——对象身份≠事务身份 |
| G-H11 | covered | 探针：第二参与者 apply 失败→receipt 回滚（双 dirty=false、可继续）；第一参与者失败原样抛出。半状态可见性单列 G-H13 |
| G-H12 | reproduced | 探针：main 侧 undo 先 invert 后 pop（失败安全 edit-session.ts:293-294）；script 侧先 pop 再 invert（script-editor.ts:1425-1427），invert 失败项脱离双栈永久丢失（再undo=false redo=false）——不对称 |
| G-H13 | reproduced | 探针：pair 提交期间脚本侧订阅见半状态（scriptBody=wait1 而 mainPrice=0） |
| G-H14 | covered | Root 仅 onOpened 成组新建双 session 后挂 App（main.tsx:122-147/158-176），无拼接已编辑栈的真实域；StrictMode/卸载由 effect 清理+leave-guard 用例（:179/:499）；单会话消费域不存在 |
| G-H15 | reproduced | 探针：齐备→effects=1 正控；缺正文→effects=0 静默丢且序列化 ok（script-editor-projection.ts:98-111 `continue`）；空正文[]→合法保留 |
| G-H16 | covered | 既有保护：coordinator.test 4、commands 114、leave-guard 18+27、save-conflict 36。最小新负控靶点：①回退启发式②禁拆半 fallback③只清一侧 redo④script undo 先 invert 化的反例⑤merge 缺正文抛错——对应 D-01 H-11 |

### G-R 场景引用删除（covered 8 / risk 2）

| ID | 分类 | 证据 |
|---|---|---|
| G-R01 | covered | 探针：disabled 选择 hook-c 索引 blockers=0、命令级删除 ok（selection 无 hookId，边正确缺席；script-editor.ts:749-774 仅 use 建边） |
| G-R02 | covered | 探针：inherit 同上 blockers=0/删除 ok——不靠 use 边偶然兜住 |
| G-R03 | covered | 探针：use hook-c blockers=1 来源 `select-hook@…variants.hook-b.flow.stages.s0.body[0]`；父场景 initial 边独立核对 |
| G-R04 | covered | typed collector 处理 currentScene（content command-target-reference.ts:97/:133）+具名测试（command-target-reference.test.ts:27/176/214）；编辑器经 canonicalCommandTargetEdges 入同一快照（adapters:1849-1855）；transition visits 覆盖 machine next/branch（script-editor.ts:403 起） |
| G-R05 | risk | 编辑器 walkCommands 有 branch/loop 嵌套（script-editor.ts:188 起）；content 侧 all/any/not 组合条件递归未逐一动态核，判 risk 待证，不另造 walker |
| G-R06 | risk | **发现**：`visitCanonicalScriptCommands` 只走实体行为/敌对/hook 流/物品私有/共享（script-editor.ts:293-371），**不走场景级 stages/machine entry.prepare/body**——探针中间版实证场景级 selectSceneHooks use 边=0；当前无编辑面触达场景级 stages（UI 只编辑 flow 内 stages，ScriptEditor.tsx:2653/2666）→潜在缺口归 D-02 补边审查，非用户可达 |
| G-R07 | covered | 冷/暖双链：App.tsx:1707-1712 暖（derived memo）/1714-1716 冷（即时 oracle provider）；删除入口 App.tsx:1736-1738/1841-1869；命令级守卫独立（sceneHookReferences） |
| G-R08 | covered | 探针：单删 hook-c blockers=1；与来源场景同删 blockers=0（deletionScopeFor 豁免，project-reference.ts:1315-1327） |
| G-R09 | covered | 探针：有引用(refs=1)删除 throw「仍有 1 个引用: …flow…」变体保留（script-editor.ts:1884-1888 命令级守卫）；清引用后删/undo 恢复 ✔；UI 层另有 blockers，缺错误≠删除成功 |
| G-R10 | covered | 探针：use 边 locator=canonical-script（owner scene-hook/step s0 body）稳定；去引用 blockers=0 反向控制成立 |

### G-I 图片上传异步边界（covered 4 / risk 4）

| ID | 分类 | 证据 |
|---|---|---|
| G-I01 | risk | pickFile 无过期令牌：SpriteUploadWizard.tsx:145-174 await 解码后无条件 setDraft(:162-168)，后完成者胜非后选择者胜；组件竞态无渲染环境未做业务反例。归 D-03 上传乱序根 |
| G-I02 | risk | 同根：旧 A 失败迟到 setError(:171-173) 覆盖 B 会话；setErr('') 仅新 pick 清(:147) |
| G-I03 | risk | 旧 A 成功迟到 setDraft 复活旧图；提交以 draft 为准(:177/191-220) 无选择序号核对 |
| G-I04 | risk | 卸载无检查(:162-173/:218-227)；卸载后 setState 为 no-op，但 submit 内 session.dispatch(:218-220) 卸载后仍真实入历史——是否缺陷属产品裁决 |
| G-I05 | covered | 探针：同 id 重复提交命令级 throw「精灵定义 id 已存在」；组件级 submittingRef 门禁(:146/:177/:187) |
| G-I06 | covered | 探针：同字节不同 id 复用同一 asset 键（路径数=1，wizard:202-205 一致）；id/label 派生(:158-170) 与字节归属分列不误报 |
| G-I07 | covered | 探针：真实管线（slice/quantize 真实调色板/encode/gzip/sha + AddSpriteCommand）按 B 提交 sha=B(4aa3aff5)≠A(c4ae389b)、bytes/blob 全来自最后选择 |
| G-I08 | covered | bitmap.close() 即时释放(:156)；失败无句柄可漏；错误后 draft 保留可重试；内存无实测不判泄漏 |

### G-C 预览缓存身份与重试（reproduced 4 / covered 3 / risk 3）

| ID | 分类 | 证据 |
|---|---|---|
| G-C01 | reproduced | 探针（渲染真实组件）：FIRE 同 chunk(#7) 不同工程基座，A 读取后 B 挂载 **B 读=0**（chunk-only 键复用 A 结果；FireEffectPreview.tsx:15-18）。读取计数判定，未看画面 |
| G-C02 | reproduced | 与 G-C01 同根：键不含 reader/workspace，同 projectId 不同 workspace 共用（B 未被读取） |
| G-C03 | covered | 探针：同 AssetId 真实换 sha/path → 新路径读=1 旧=0（thumb 键含 revision SpriteThumb.tsx:24 + 下层 SpriteAssetCache 记录签名失效 reforge/assets.ts:218-227 双层正确） |
| G-C04 | covered | 探针：同 reader 同 revision 双挂载读取=1（去重生效） |
| G-C05 | reproduced | 探针：首读失败修复后再挂载读取保持 1——null 被缓存、重试被吞（SpriteThumb.tsx:36-38）；下层失败即删条目（assets.ts:236-239）不缓存失败——问题仅在 thumb 层 |
| G-C06 | reproduced | 探针：FIRE 失败修复后重挂载读取不变——失败 null 永久缓存无重试通道（与 G-C01 同根） |
| G-C07 | covered | effect cleanup alive=false 丢弃迟到 setFrames（SpriteThumb.tsx:88-107、FireEffectPreview.tsx:66-75）；视图归属 alive 门+key 双重限定 |
| G-C08 | risk | SpriteThumb 换 revision 正确（G-C03）；FIRE 键无 revision，替换 FIRE 源后同 chunk 永远旧帧——与 G-C01 同根归并；undo 保留策略未动 |
| G-C09 | risk | 容器 census：fireCache/thumbCache 模块级强引用（关工程不释放）、StampPreviewCanvas 用 WeakMap(:31-32) 可回收；无实测不宣布泄漏/性能缺陷 |
| G-C10 | risk | 三层编辑器预览缓存与 reforge AssetResolver 无统一失效层；最小正确层建议=(资产身份,revision) 键+失败不入缓存可重试；回归设计=同 reader 双挂载计数+失败恢复（本探针雏形） |

## 归并、待证与建议回归（GLM填写）

按根因归并（不膨胀缺陷数）：

1. **D-01 全局撤销顺序/事务**（已开卡）：G-H01/02/03/07/08/12/13/15。
2. **FIRE 缓存键根因**：G-C01/02/06/08（chunk-only 键+失败入缓存）——建议缓存身份新卡统一处理。
3. **SpriteThumb 失败缓存**：G-C05（独立于 FIRE）。
4. **上传向导过期令牌缺失**：G-I01/02/03/04（pickFile 无 staleness 防护根）——D-03 域。
5. **场景级脚本命令对引用图不可见**：G-R06（潜在、无编辑面触达）——归 D-02。
6. 待证 risk：G-R05（组合条件递归）、G-C09/10（释放与分层）。

建议转正式回归最小集合（Codex 决定）：D-01 实现时吸收 G-H16 五靶点+本批 G-H01/02/07/12/13/15 探针场景；缓存卡收 G-C01/05/06 探针；上传卡收 G-I01-04（需组件渲染环境 entered/deferred 控序）。

## 最终机械对账（GLM填写）

- 分类计数：reproduced 12（G-H01/02/03/07/08/12/13/15、G-C01/02/05/06）+ covered 23（G-H04/05/06/09/10/11/14/16、G-R01/02/03/04/07/08/09/10、G-I05/06/07/08、G-C03/04/07）+ risk 9（G-R05/06、G-I01/02/03/04、G-C08/09/10）+ blocked 0 + N/A 0 = **44**。
- 命令/退出码/日志：见「复算入口」；四次探针 exit 0，过程失败清单见上，未删失败证据。
- 白名单：仅本报告 + 四个 probe-glm-*-prep.mjs；packages/scripts/projects/data/reference/锁文件/正式配置与测试/覆盖率基线/原探针零 diff（提交时 git 复核）。真实工程/浏览器零写；未跑全仓质量门。
- 后续采纳须披露 GLM 贡献，不以自测代独立终审。

## Codex接收复核

待执行；此区域由Codex填写，GLM不代写accept/counter。
