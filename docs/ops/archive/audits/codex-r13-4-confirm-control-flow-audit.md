# N3-1 P7-R13-4 `confirm` 源控制流审计

> 日期：2026-07-29
> 性质：R13-4 build 前只读审计；不是实现完成声明，也不替代 Kimi / GLM 推进签字。
> 结论：不能只把 Reforge host 的恒 `true` 换成真实 UI。当前 28 个源执行位中有 22 个在
> P3 → P7 投影时丢失了“否”分支的 activation 生命周期；真实确认框直接上线会让“否”
> 继续执行“是”的后缀。

## 1. 冻结口径

- 源 RAW `0x0A`：**26 个唯一地址**。
- source execution sites：**28 个**。只有 `@11019` 扇出到 `s050/e845`、`s050/e846`，
  `@14583` 扇出到 `s084/e1583`、`s084/e1584`；其余源地址各一个执行位。
- R13 cadence parent：**28 个**物理 `confirm`。
- R13 cross-activation / R13-3 final：**31 个**物理 `confirm`。
  - `s029/e536` 的 `phase-002` 增加一份；
  - `s030/e540` 的 `phase-002` 增加一份；
  - `s108/e2002` 的旧嵌套一份被拆成 `continuation-004` / `continuation-006` 两份，
    净增加一份。
- source census digest：
  `3d19fb14b8261fd5a0e48f20cbd1e80fc57c31622624bb09126eb86ea2cb13ac`。
- 修复前 cadence confirm target digest：
  `1eeb4361188e6031f970c8a541128d201ed9ea0f87889055df5e74644b194036`。
- 修复前 final/runtime digest：
  `556885e1982542f9e3a66356e93f9b1ea5471ab5666328440b098dbd1a031ce9`。
- 31 个 final 节点分布在 18 个场景：
  `s005,s009,s023,s029,s030,s050,s081,s084,s091,s100,s102,s108,s111,s118,s127,s128,s131,s148`。
  当前 `projects/pal` 与 baseline 的这 18 个场景逐字节相同。

## 2. 26 RAW → 28 logical → 31 physical

`E` 表示当前已保真；`X` 表示形式上有 `confirm`，但 No 生命周期丢失。

| RAW | 源执行属主 | No 目标 / 生命周期 | 当前 final selector（省略 `content/scenes/`） | 结论 |
|---:|---|---|---|:---:|
| 3751 | `s005/e128` | 3746 / end+advance | `s005.json#e128/trigger/default/initial/body/1` | X |
| 3862 | `s009/e188` | 3925 / reset→3860 | `s009.json#e188/trigger/default/initial/body/1` | X |
| 3868 | `s009/e188` | 3925 / reset→3860 | `s009.json#e188/trigger/default/initial/body/4` | X |
| 7452 | `s030/e540` | 7469 / reset→7466 | `initial/body/2` + `phase-002/body/2` | E×2 |
| 7484 | `s029/e536` | 7477 / plain END | `initial/body/1` + `phase-002/body/1` | E×2 |
| 7569 | `s023/e437` | 7566 / end+advance | `s023.json#e437/trigger/default/initial/body/3` | X |
| 11019 | `s050/e845,e846` | 11012 / advance→11017 | 两个 owner 各 `default/initial/body/1` | X×2 |
| 14486 | `s081/onEnter` | 14461 / loop | `initial/body/100` + `cycle/body/26` | E×2 |
| 14583 | `s084/e1583,e1584` | 14578 / advance→14581 | 两个 owner 各 `legacy-001/initial/body/1` | X×2 |
| 15388 | `s091/e1682` | 15398 / advance→15409 | `default/initial/body/2` | X |
| 15947 | `s131/e2292` | 15999 / reset→15943 | `default/initial/body/1` | X |
| 15962 | `s131/e2292` | 15968 / advance→15993 | `default/stage legacy-002/body/1` | X |
| 16223 | `s127/e2224` | 16219 / end+advance | `default/initial/body/1` | X |
| 17181 | `s111/e2085` | 17178 / end+advance | `default/initial/body/1` | X |
| 17497 | `s100/e1824` | 17500 / advance→17536 | `default/initial/body/3` | X |
| 17725 | `s100/e1825` | 17718 / advance→17723 | `default/initial/body/1` | X |
| 17740 | `s100/e1825` | 17718 / advance→17723 | `default/initial/body/8` | X |
| 17789 | `s100/e1825` | 17784 / end+advance | `default/stage legacy-002/body/1` | X |
| 19272 | `s108/e2002` | 19261 / advance→19266 | `continuation-004/body/1` | E |
| 19292 | `s108/e2002` | 19281 / advance→19286 | `continuation-006/body/1` | E |
| 19352 | dynamic `s108/e2005→s128/e2245` | 19309 / reset→19350 | `s128/e2245/legacy-001/initial/body/17` | X |
| 19836 | `s100/e1817` | 19829 / advance→19833 | `default/initial/body/1` | X |
| 19888 | item287/C8→`s118/e2165` | 19917 / plain END | `c8-b88cfe32b808/stage-1/body/5` | E |
| 20363 | `s100/e1837` | 20355 / advance→20360 | `default/initial/body/1` | X |
| 21207 | `s102/e1882` | 21220 / advance→21226 | `default/initial/body/9` | X |
| 23518 | `s148/e2433` | 23511 / end+advance | `default/initial/body/3` | X |

汇总：

- 当前保真：**6/28 logical，9/31 physical**。
- 当前有损：**22/28 logical，22/31 physical**，对应 **20/26 RAW**。
- 22 个有损节点位于 **18 个 `stages` flow 容器**，这些容器共有 **26 个旧 stage cursor id**；
  s009、s100/e1825、s131 分别在同一个 flow 内含 2、3、2 个 confirm。
- No 终点族按层分别为：
  - 26 RAW：plain END 2、end+advance 18、reset 5、loop 1；
  - 28 logical：plain END 2、end+advance 20、reset 5、loop 1；
  - 31 physical：plain END 3、end+advance 20、reset 6、loop 2。
- 真正需要转换的 22 个 lossy logical 节点是 end+advance 18、reset 4；plain END 与 loop
  当前都在 exact 集合，因此转换器还必须用 synthetic fixture 覆盖这两种 terminal，
  不能拿 exact bypass 冒充转换能力。
- 没有 RAW 丢失，也没有 final `confirm` 节点缺失；这是
  “已 emitted 但 activation 生命周期静默丢失”，不能用 presence/count 测试证明正确。

## 3. 用户可见反例

- `s005/e128` 买水果：选“否”仍会继续扣 25 文并给水果。
- `s050/e845,e846` 买米：选“否”显示“没钱买就走开”后，仍继续扣钱并给米。
- `s009/e188`：选“否”显示“那就算了”后，仍继续“是”分支的整段剧情。

当前 `packages/reforge/src/main.ts` 的 `confirm` host 恒返回 `true`，所以这些错误在运行时一直
被遮住；接入真实 No 后会稳定暴露。

## 4. 根因

1. `packages/migrate/src/translate-events.ts` 把 RAW `0x0A` 翻译为 `confirm.onNo`；
   `inlineArm` 能把源目标带回迁移 IR。
2. `packages/migrate/src/experimental/script-v5/p3-control-flow.ts` 生成的
   `n3P3FlowExit` 明确携带
   `continuation: 'terminate-current-activation'`。
3. `packages/migrate/src/experimental/script-v5/p7-canonical.ts` 的 `generatedP3()` 只展开
   `structure.target.body`，没有消费 continuation / terminal cursor。
4. 递归投影 `confirm.onNo` 后，No 目标正文可能仍存在，但 advance/reset/loop/termination
   生命周期已经丢失；runner 正确执行完 `onNo` 后会回到父命令循环，继续 Yes 后缀。

现有正确模式已经存在：

- `packages/migrate/src/experimental/script-v5/p7-state-machine.ts`
- `packages/migrate/src/experimental/script-v5/p7-owner-machine.ts`
- `packages/migrate/src/experimental/script-v5/r13-trigger-activation-graph.ts`

它们都把 `confirm` 赋稳定 `CommandId`，再用 `commandOutcome(no)` 把 No 指向源目标状态、
Yes 指向同步后缀状态。

## 5. 修复约束

1. 修 `packages/migrate` 上游并全量重生成；禁止手改 `projects/pal/**` 或 baseline scene。
2. 保持 canonical `confirm` / `commandOutcome` schema 不变，不另造第二种确认命令。
3. 为保持已签 R13-1～R13-3 authority append-only，**冻结旧 P3/P7 projector**。新修复必须
   插在 item-throw successor 之后，形成唯一 source-backed augmentation；不得直接修改
   `p7-canonical.generatedP3()` 后又要求 cadence/cross/item 旧 parent byte-identical。
   输入契约必须显式包含已经不在 final JSON 中的源事实：

   ```ts
   augmentR13ConfirmControlFlow({
     snapshot: itemThrows.snapshot,
     sourceCommands,
     p3FlowStructures: chain.p6.ir.flowStructures,
     sourceCensus,
     physicalExpansionEvidence: triggerActivationEvidence,
     c8Evidence,
   }) // -> confirm.snapshot + confirmSourceEvidence
   ```

   `confirmSourceEvidence` 在旧 projector 输入侧冻结 28 logical site 的 source SHA、
   `terminate-current-activation`、No target/terminal 与 Yes fallthrough，再由
   `physicalExpansionEvidence` 证明 28→31 的 1:N 映射。MG2 必须 pin 所有输入 digest；
   不能只看 item-throw snapshot 猜 onNo 路径，也不能让篡改 final JSON 自证源账。
4. 22 个有损执行位统一改成稳定状态机；同一 flow 含多个 confirm 时按源顺序递归切分，
   每次只消费当前 prefix/decision，Yes continuation 再继续切下一个 decision：
   - 当前状态正文 = prefix + 带稳定 id 的 `confirm(onNo:[])`；
   - `commandOutcome(no).then` = 编译后的源 No target，保留 plain END /
     advance / reset / cycle 与正确 yield；
   - `else` = Yes 后缀，使用同步 `continue`，恰好执行一次；
   - 不得只在 `onNo` 末尾追加 `stopScript`，因为它不能提交 advance/reset/cycle cursor。
5. 已保真的 6 logical / 9 physical 必须保持语义与 yield，不得二次包裹：
   - `s081` No 回环的 `macroTask/worldTick` 差异与 Yes 同步续跑；
   - `s029/s030` 两个 physical copy；
   - `s108` 两个 continuation；
   - C8 `@19888` 的私有物品脚本闭包。
6. 生成的 machine/state/command id 不得泄漏 PAL 地址；地址只进入迁移 evidence。

## 6. R13-4 evidence / MG2

新增 append-only `r13-confirm-v1`，parent 必须是当前
`r13-item-throw-v1` 经三方签批后**原子提交的已发布 digest**。此前置已于
`3a03bfdd3ef096613b9c10d42e3dbb7ced817624` 完成：R13-0～R13-3 实现、manifest
与三个 R13 seal 已原子提交；已发布 item-throw digest 为
`c8df75a51de4c71ae5e71d43583b749736aecd61b0fd65e9b2568f2e1324502b`。
R13-4 新 seal 只能以该提交和 digest 为不可变 parent。
以下五层必须逐文件 byte-pin：

1. `script-v4-v5`
2. `c8-item-use-v5-v1`
3. `r13-cadence-v1`
4. `r13-cross-activation-v1`
5. `r13-item-throw-v1`

新 evidence 对每个 source execution site 至少保存：

- census site id、source command SHA、RAW address、No target、Yes fallthrough；
- source terminal lifecycle（plain END / advance / reset / loop）；
- 31 个 final physical selector：
  - entity 用 scene + entity + channel + behavior；
  - hook 用 scene + slot + hook；
  - 再接 flow kind + machine/state 或 stage id + `CommandId`；
  - C8 @19888 当前无 `CommandId`，使用 item/script/behavior/stage 稳定 id +
    command digest + flow 内唯一性断言；
  - 不得只用数组下标或含糊的 body 身份；
- command id、No target transition digest、Yes continuation digest、final flow digest；
- runtime capability 的 executed evidence id。

必须同时升级审计方法版本：

- source disposition `v2 → v3`：不能再用“confirm runtime 恒 true”的统一 open debt；
- runtime capability `v1 → v2`：world interactive/auto/item-private 的 confirm cell 必须
  `executed`，confirm open debt=0。

删除/复制 confirm、交换两臂、篡改 command id/target/yield、漏 fanout/copy 或只改最终产物，
都必须 fail-loud 并精确 reopen 对应 source site。

正式迁移必须证明：

- fresh rebuild；
- 第一次只出现新 seal、`_state`、manifest 与以下 **13 个 lossy scene**：
  `s005,s009,s023,s050,s084,s091,s100,s102,s111,s127,s128,s131,s148`；
- 只进 evidence 的五个 exact-only scene
  `s029,s030,s081,s108,s118` 必须逐字节不变；
- 第二次 `writes=0 / deletes=0 / conflicts=0`；
- live 后 dry-run 仍 0/0/0；
- project/baseline 同路径逐字节相同，无 stale overlay。

## 7. content / SAVE epoch

项目选择不为 **18 个 flow / 26 个旧 stage cursor id** 编写一次性映射；沿用用户已拍板的
“开发期 epoch 断开，不兼容未完成游戏旧档”：

- 提案：`contentVersion 8 → 9`；
- 提案：`SAVE_VERSION 7 → 8`；
- 提案：`minimumSaveVersion 7 → 8`；
- `WorldStateV9 = WorldStateV5`，不新增世界字段；
- 只接受 SAVE8/content9；SAVE7/content7、7/8、7/9、8/7、8/8 与未来组合都在任何
  sidecar I/O 前 fail-loud，提示新开游戏；
- A7-4 候选 epoch 顺延到下一未占用版本（当前为 v10）。

这是主动采用的开发期版本政策，不是由世界字段或 flow kind 机械推出，也不是新增 canonical
命令/schema。若审查方主张保留 content8/SAVE7，必须给出 18 个 flow / 26 个旧 cursor 的
逐 cursor 双向 identity 方案；不能以“世界字段没变”代替游标兼容证明。

## 8. runtime 与 Editor

### Reforge

- 新增中央 modal arbiter 下的独立脚本二选一控制器；只复用 `drawConfirmBox` 视觉原语，
  不复用 `SystemMenuState` 的退出/开关业务状态。
- 默认选“否”；四方向键切换；Enter/交互键提交；Esc/Menu 等价于“否”。
- 已活跃的 shop/system/save modal 先完成，脚本 confirm 排队；confirm active 后禁止新 modal，
  script confirm 彼此 FIFO。问句 dialog 不是竞争 modal，而由同一脚本持有。
- confirm active 时冻结 gameplay clock：player/party move、auto runner、hostile、scene timer、
  fade 与世界推进都暂停；只继续画面/UI blink/audio。该冻结域只属于 confirm，不推翻此前
  “普通对话不冻结 NPC”的产品裁决。
- 脚本 prompt 输入优先于 dialog/runner 普通吞键，并阻止同时打开 system/shop 菜单。
- prompt 活跃期间使用 dedicated held-frame/token 保持上一帧问句对话；至少跨两帧，
  只在 settle/abort/session replacement 时释放，不复用 one-microtask
  `preserveClosedDialogFrame`。
- 多 runner 请求按 FIFO 串行；每个请求单次 settle。
- abort、场景 session replacement、runner replacement 会关闭/拒绝对应 prompt，
  不执行任一分支；旧 session 的迟到按键不能提交。
- 持久 flow 的 prompt promise 继续持有 coordinator runner lease；现有
  transient/shared/item-private `runCommands()` 还不在 coordinator 内，必须新增不写
  `FlowCursor` 的 activity token/lease，包住整个 transient execution。
- 存档屏障不得在“已显示但未回答”或“已回答但 commandOutcome 尚未提交 safe point”时拍快照；
  item-private prompt 打开后直接请求 save 也必须等待回答与整个脚本完成。

### Editor

现有 canonical 预览把 v5 state machine 降成 v4 stage，无法保真 `commandOutcome`；只把
`playback.confirm` 从恒 true 改成按钮仍是假闭环。R13-4 必须：

- canonical 场景/共享脚本预览直接走 `ScriptRunnerV5`（或与之等价的共享 v5 执行器），
  不再把 `commandOutcome` 拍平成 v4 `next`；
- 旧 v4 PreviewCanvas 只保留给 legacy 非 canonical 预览；
- 预览 UI 提供同样的默认 No、Yes/No 点击与键盘输入；
- stop、切换场景/实体/方案、组件卸载都会 abort prompt，且不污染作者数据或世界存档。

## 9. 最低验收矩阵

1. `26 RAW / 28 logical / 31 physical` 精确双向映射，覆盖四种终点族、两个 fanout、
   三个 R13-2 physical expansion 与 C8 私有脚本。
2. 逐 site 两臂 oracle：
   - No 只执行目标一次，绝不执行 Yes suffix，next cursor/lifecycle 正确；
   - Yes 不执行 No target，suffix 恰一次。
3. 同 flow 多决策组合：s009 至少首个 No、Yes→第二个 No、Yes→Yes；s100/e1825 覆盖
   三个 decision 全 Yes 与每个位置首个 No；s131 覆盖 Yes→No，确保递归 split 不漏后续、
   不重复 suffix。
4. 转换器 synthetic fixture 单独覆盖 plain END 与 loop；exact bypass 不算转换覆盖。
5. 重点反例：`s005` No 不扣钱/不给水果；`s050` No 不扣钱/不给米；
   `s009` No 不继续剧情。
6. `s081` 两 physical copy 的 No 回环/yield 与 Yes 同步续跑均精确。
7. source disposition v3 与 runtime audit v2：confirm refused=0、confirm open debt=0，
   unregistered refused=0；不能冒充 R13-5/R13-6 或 R13-Z 全域 open=0。
8. runtime/UI：默认 No、Esc=No、方向切换、Enter、鼠标/键盘双提交防重；central modal
   先来先服务、confirm gameplay freeze、held frame 两帧、abort/session replacement
   关闭 prompt 且不跑任一臂；持久与 item-private/transient save barrier；system/shop
   confirm 不被脚本 confirm 污染；runner commandOutcome/同步续跑恰一次。
9. 版本拒绝矩阵只接受 SAVE8/content9；其余旧/错配/未来组合均在 sidecar I/O 前失败。
10. Editor v5 预览：Yes/No 命中不同 state；stop/switch/unmount 取消；不再经有损 v4 lowering。
11. MG2：旧五层 byte-pin、新 seal initialize/replay/half-state/tamper/drift、
   正式重迁二跑 0/0/0。
12. 浏览器金丝雀至少覆盖：
   `s005,s009,s050,s029,s030,s081,s108,s118`，另覆盖 prompt 中 abort/save/session replacement。
