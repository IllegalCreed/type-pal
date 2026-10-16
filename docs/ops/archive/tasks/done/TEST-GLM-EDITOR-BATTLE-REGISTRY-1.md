# TEST-GLM-EDITOR-BATTLE-REGISTRY-1 — battle sprite registry authoring contracts

Status: done
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops archive task card 接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始目标、范围、状态、owner、证据、counter、日期、链接和交接在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标

- 保留原卡目标、用户可见范围、实现/测试边界和关闭时点结论；当前是否需要重新启用由 successor task card 与 fresh evidence 决定。

## 范围

- 当前包含：原卡声明的实现、测试、证据、owner、状态和历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据、机器证据或历史状态。

## 前提与证据

- 行为/工程前提：原卡的 source:line、primary source、合法输入、caller、oracle 与 counter 由 quote 保留。
- 一手证据：固定 source revision `b3c24c04ddb534b9e8195a074590bea8a233fc93`、原卡全文和原卡链接；本次不重跑原执行。
- 最强替代解释与可证伪观察：若需要重新启用，必须用当前代码/数据、合法输入、业务 oracle、反例和独立 review 重新核验；不能以历史 done 或数量补齐。
- 当前状态：done（历史快照）；本页治理检查口径要求 contentVersion=22 / SAVE12，源卡中的较早版本只属于其日期范围。

## 验收

- 功能/文档：原卡的历史验收、失败、blocked、rework、未执行边界和交接保持原样。
- 测试与证据：本次验收只包括 source/after SHA、模板章节、链接、history overlay 和 quote inverse。
- 视觉或 E2E（如适用）：本次未执行 runtime、E2E、视觉或 coverage，信用为 0。

## 状态与交接

- 当前 Owner：原任务 Owner/贡献者与历史 reviewer 保留于 quote；当前文档治理 owner 为 Codex。
- 阻塞/决策：历史卡不可单独授权当前工作；重新启用必须创建/更新当前 task card。
- 下一步：由对应 successor、当前 consumer 和 fresh receipt 重新核验；本次不推进状态。

## 历史范围

- 原始日期、版本、阶段：源文档固定于 `b3c24c04ddb534b9e8195a074590bea8a233fc93`；本轮为 R59。
- 归档原因：已关闭任务只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论

- TEST-GLM-EDITOR-BATTLE-REGISTRY-1 — battle sprite registry authoring contracts：原始顶部状态为 done；完整原始语义保留于下方 quote。

## 当时证据

- 原始命令、产物、SHA、签字、counter、链接和未决项保留于 quote。

## 当前有效性

historical。do not promote historical task card to current build/runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：当前 task card、代码/consumer 和 fresh receipt 是事实权。

## 继任文档

- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

## 原文保全

固定 source revision `b3c24c04ddb534b9e8195a074590bea8a233fc93`，source SHA `ed67412b67a8a1c020bb84c29b527833f92394d3929fa80a0a74f38f17eaa16a`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-EDITOR-BATTLE-REGISTRY-1 — battle sprite registry authoring contracts
>
> Status: done
> Owner: GLM
> Reviewer: Codex（独立验收）
> Phase: phase2
> Capability: editor / battle sprite registry
> Branch: `codex/glm-editor-battle-registry-r1`
> Visual Verification Timing: dev-functional
>
> ## 目标与范围
>
> 补齐 Editor 战斗精灵注册与敌方队伍作者流程的真实合同；不与已收口 Editor asset-lifecycle/authoring 卡重复，也不以覆盖率或例数作为指标。范围为 `BattleSpriteLibrary.tsx`、`BattleSpriteUploader.tsx`、`EnemyTeamTab.tsx`、`EnemyBattleSpriteThumbnail.tsx` 的公开交互：注册/替换/删除、缺失资源回落、重复 id/坏元数据拒绝、敌队引用同步和 undo。
>
> 先对照 BattleSpriteLibrary、BattleSpriteUploader、EnemyTeamTab 的所有旧测/GLM/Kimi/Cursor fullName 与业务 oracle 排重；已有证明只登记。
>
> ## 硬约束与交付
>
> 所有 React 更新在 act 内，afterEach 清理 object URL、listeners、session、临时文件并 unmount。只写本卡测试、合法 fixture、证据；不得改产品、旧测、配置、baseline、真实项目数据、强转、skip、ignore、扩大 timeout、私有 debug state 或业务核心 mock。反控必须原始绿→指定业务红→恢复绿，保存 raw/JSON/exit/执行集/三态 hash/清理证明。交付排重账、必要截图 hash、定向/相邻/typecheck/lint/docs/diff；覆盖率只记录到整体 main。
>
> ## 交付记录（GLM r1，2026-10-05，基 origin/main 053ae5bb4）
>
> 排重结论与新增合同（fullName 全清单与放弃分支举证见各测试文件头）：
>
> - 已证不补（登记）：导入全链/替换/删帧/undo（c02-g01~g07 ×70、K01、glm-m、glm-ui-wave、
>   BattleSpriteLibrary.test.tsx）；上传器全输入域（C03-G05 ×10、F04 ×2）；缩略图可见性门/
>   共享缓存/失败逐出/迟到帧（EnemyBattleSpriteThumbnail.test.tsx ×5）；敌队槽位/新建守卫/
>   删除全链/复制（K11 ×6、EnemyTeamTab.test.tsx ×10）；命令层重复 id（battle-sprite-commands.
>   residual:74）。
> - 新增 `BattleSpriteLibrary.glm-battle-registry.test.tsx`（2 例）：
>   - BR-01 注册门——beginUsage 解码证明门（proofReady；消息全旧测 grep 零命中）。扣留期拒绝
>     且零提交，放行后同入口入库并过保存门。FileSource.readBytes 按路径闸门=宿主磁盘端口注入。
>   - BR-02 缺失回落——字节读取整体失败（区别于 G04-07 的解码校验失败）：预览 alert 回落、
>     证明门拒绝、删除源文件 fail-closed（catalog/历史不变）。
> - 新增 `SpriteFrameDeletion.glm-battle-registry.test.ts`（1 例）：BR-04 删帧规划守卫——
>   越界/非整数帧号与末帧清空拒绝（两条消息全旧测 grep 零命中），合法边界不抛对照。
> - 新增 `EnemyTeamTab.glm-battle-registry.test.tsx`（1 例）：BR-05 宿主深链同步——挂载后
>   focusObjectId 变化收起创建卡并跟随选择、陈旧深链不偷换；旧测 Harness 的 focus 均为静态
>   prop 或点击回喂，宿主主动深链输入从未出现。
> - 放弃分支（实证）：UI 层重复 id 抢注竞态 unreachable——外部 dispatch 改变 battleSprites
>   身份会经 BattleSpriteLibrary.tsx:461-478 焦点效果 setCreatingUsage(false) 先丢弃草稿
>   （G01-04 同机制），实测确认「新用途尚未写入项目」消失、零提交、无重复落库；命令层由
>   residual:74 直测。applyDefinitionDraft not-ready 报错被按钮 disabled 封死（1647）。
>   EnemyTeamTab nextTeamId 空洞语义与 K11 预选同 caller 同 oracle，按排重不另立。
>
> 验证与证据（`docs/ops/evidence/TEST-GLM-EDITOR-BATTLE-REGISTRY-1/`）：
>
> - 定向 4/4 绿、零 act 警告（directed.raw，sha256 09e165f8…）；相邻 17 文件 141/141 绿
>   （adjacent.raw，sha256 9c6fc40a…；其中 act 警告为旧 cursor/kimi 文件基线，非本卡）。
> - 反控 4 针三态绿红绿（run-counterproof.mjs 重放，counterproof.json）：N1 beginUsage 证明门
>   移除→BR-01 红（'上传的战斗精灵至少需要 1 帧' ≠ 门消息）；N2 deleteAsset 跳过删除前读取
>   校验→BR-02 红（catalog 被移除）；N3 删帧规划守卫移除→BR-04 红；N4 深链效果置空→BR-05 红。
>   每针恰 1 红、恢复绿、产品零残留（git status --porcelain packages/ 无 M/D）。
> - typecheck 0 错（含 author-check）；`pnpm lint` 3354 文件 0/0/0；定向零 act 警告；
>   `git diff --check` 干净。覆盖率未采集（非本卡指标）。
> - docs 门：board.md/tasks index.md 的 content-review SHA pin 按 8494b465c 先例字节级外科
>   刷新（reviews/20261004-semantic-current-batch.json 18+/6-，双 entry 补 sha-refresh history）。
>   `check-content-review --strict` 仍报 `docs/ops/evidence/README.md: after SHA drift`——该文件
>   本卡未触碰、字节与 origin/main 完全一致，pin 在 main 上既已过期（392aaf007 只补 history
>   未刷值），属既有漂移，按 TEST-GLM-GAME-DIALOGUE-PAGINATION-1 同判例留 Codex 处置。
> - 技术判例（供后续卡）：vi.waitFor 不能包进 act——它轮询的 DOM 文本要等 act 退出才 flush，
>   互相等待死锁（实测 8s 不回绑）；正确形态=沉睡在 act 内、断言在域外的轮询循环。
>   content-review pin 刷新禁 json.dumps 全量重排（实测 ±473 行），须按 entry 块边界做
>   纯字符串替换（注意 evidence 子项也有 path 键，边界用 4 空格 entry 开括号定界）。
>
> ## 下一位 Agent 提示词
>
> ```text
> 你是 TEST-GLM-EDITOR-BATTLE-REGISTRY-1 的独立验收方（Codex）。工作树 /private/tmp/type-pal-battle-registry（branch codex/glm-editor-battle-registry-r1，基 origin/main 053ae5bb4）。先读本归档卡交付记录与 docs/ops/evidence/TEST-GLM-EDITOR-BATTLE-REGISTRY-1/counterproof.json，再独立复核：1) 排重账——抽核 c02-g01~g07/K01/C03-G05/K11/EnemyTeamTab.test.tsx/EnemyBattleSpriteThumbnail.test.tsx 的 fullName 与四新合同（BR-01/02/04/05）确无同 caller+同 oracle 重复，放弃分支举证成立（尤其 BR-03 改道理由：BattleSpriteLibrary.tsx:461-478 焦点效应 setCreatingUsage(false) 使 UI 层重复 id 抢注 unreachable）；2) 反控——node docs/ops/evidence/TEST-GLM-EDITOR-BATTLE-REGISTRY-1/run-counterproof.mjs 重放三态，核每针恰 1 红、AssertionError 落点、零 act 警告、产品零残留；3) 定向三文件 4/4 零警告 + 相邻 17 文件 141/141 + typecheck + pnpm lint 0/0/0 复跑。测试文件头有完整排重账与放弃分支 file:line 举证。你只验收收口或记 rework；本卡已标 done，覆盖率与例数不是验收条件。
> ```
> ---
>
> ## Codex quality closure (2026-10-05)
>
> 候选 `02b2e04493028db3868d42eb3debd1ebd66f21ec` 已独立验收：4/4 定向测试、4/4 反控、typecheck、lint 0/0/0、docs、phase/lore 通过；content review 已同步最新 main，diff 干净。本卡已集成 main，原候选分支进入退休清理。
>
> ## Codex integration correction (2026-10-06)
>
> 复核发现原收口文字先于实际 Git 集成落盘：`origin/main` 当时没有三份新增测试或对应证据，候选分支仍保留未合入提交和两个 worktree。Codex 已将已验收测试与 canonical `docs/ops/evidence/TEST-GLM-EDITOR-BATTLE-REGISTRY-1/` 证据集成当前 main；本次修正不引入产品或旧测改动，随后退休候选分支与 worktree。
>
<!-- original-source-quote:end -->
