# CODE-QUALITY-93 evidence — game sell menu state contract

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE-QUALITY-93（game sell menu state contract 核验）证据目录的索引页,对应归档任务卡 docs/ops/archive/tasks/done/CODE-QUALITY-93-game-sell-menu-contract.md（done）。本批完整核验 sell-menu.ts 与三份专属测试,生产实现字节未改;仅精简与补强测试合同。阶段为 phase1,无 schema/save、migration、资产、公共接口或产品行为改动。证据原件即下方逐字节保全的固定main源(3293B,SHA 4b1f5e7eb145)。

## 来源与输入

来源为固定Git载体,非本次运行;本页正文无 markdown 链接(原0个链接,处置见作者review的linkDisposition)。真实内容:

- source-callers.txt: 白名单、真实 menu-driver/bootstrap/event-system/inventory/draw-shop caller 与 SDLPal primary source;源锚点另见任务卡。
- source-snapshot.json: 开批 HEAD f52a10e4/originMain cddf6555 与四个白名单当前/HEAD SHA——sell-menu.ts 139行 sourceUnchanged=true,三份测试 current≠HEAD(测试变更是本批全部实质变更)。
- targeted.txt/.exit: sell-menu、shop/menu-driver、inventory、draw-shop 相邻合同 9 files / 96 tests exit0、无 stderr 诊断;为满足 diff 空白门文本去结尾空行,完整合并输出字节与 SHA 保留在 targeted-process.json(96 passed, 4.56s)。
- typecheck.txt/.exit、biome.txt/.exit: game typecheck 与白名单/反控工具静态门 exit0 零诊断;typecheck-process.json 保留未归一化完整输出(tsc --noEmit)及 SHA。
- mutation-runner.mjs 在独立临时树读取真实源/测试运行原集合(15用例),再按 file×fullName 精确执行三态反控;只改临时树。mutation-raw/ 保留原 JSON/raw、execution identity、exit/signal、源/测试/重建 mutant hash、restored green 与 cleanup.json 的精确目录删除证明。3/3 指定业务 AssertionError 通过: inUse 耗尽边界误放行(true≠false)、新选择保留旧 Yes 意图(true≠false)、增表刷新丢失非零 cursor(+0≠1)。
- gate-check-docnav-failure / gate-check-content-hash-failure: 第一/二轮全仓门分别在 evidence 导航遗漏与内容审阅 SHA 未同步处 fail,业务测试未执行;原件保留。docs-preflight.txt/.exit: 补齐后文档门通过,1277 Markdown / 6789 links / 415 tasks、570 content-review documents,exit0。
- 全仓 VITEST_MAX_WORKERS=1 pnpm check 完整 exit0: 7包 typecheck/test 与工具/文档门通过;game3569、editor4951、migrate739,最终 lint4047 files 0 errors/0 warnings/0 infos。
- gate-ratchet-retirement-needed.raw.json: ratchet 在测试身份有删除处 fail closed(test-count: sell-menu.glm-phase1-leaves.test.ts),要求核实真实删除后显式 --allow-scope-removal;对应 test-retirement-proof.json 证明被删的是与主测试同合同的缩表用例(3→2,removedContract='non-empty inventory shrink clamps cursor to length-1',oracle 由 sell-menu.test.ts refreshSellGrid 保留)。

## 断言与业务 oracle

文档事实核对(currentExecution=false):各记录按其自身字段成立。测试质量复核: 已删除与主测试同合同的 GLM 缩表用例;去两处无必要强转,以公共选择/确认入口替代直改 phase;拆开独立导航/意图/取消/刷新输入轴;确认导航逐操作断言防抵消,增表使用非零 cursor,数量均合法;typed catalog 使用物品 OBJECT ID 仅作菜单输入,不宣称是原始价格/flag。最终联合门均 exit0(见 CODE96 的 gate-check/ratchet/protected-fast 每门 txt/exit/raw.json、最终 file SHA snapshot 与 final-docs/lint/ledger 回执);仅关闭 CODE93 四条+CODE96 两条,其它 review/pending 不变。用户指定停止后交 GLM,CODE94/95 候选独立门尚未完成,未合 main。可读日志只去行尾/末尾空白,同名 raw.json 保留逐字输出/SHA。空数组/exit0不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;本轮语义整改把实现未改/三测试变更身份、三针反控失败身份、两次门失败原因与最终联合门收口写回可见正文,不重开任务、不重跑执行。不产生新执行结果。

## 限制与复核

未重跑原命令;历史结论保持原时点。各 *.txt/.exit 与 mutation-runner.mjs 不在本轮1916候选集合内,数字按本页与目录内 JSON 交叉见证。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3293B / SHA-256 4b1f5e7eb14563a5899af5fa0d17fba5d4457d9b06da1e4dbac8426b1c82640c；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-93 evidence — game sell menu state contract

本批完整核验 `sell-menu.ts` 与三份专属测试，生产实现字节未改；仅精简与补强测试合同。阶段为 phase1，无 schema/save、migration、资产、公共接口或产品行为改动。

- `source-callers.txt`：白名单、真实 menu-driver/bootstrap/event-system/inventory/draw-shop caller 与 SDLPal primary source；源锚点另见任务卡。
- `source-snapshot.json`：开批 HEAD/originMain 与四个白名单当前/HEAD SHA，明确实现未改、三测试变更。
- `targeted.txt`/`.exit`：sell-menu、shop/menu-driver、inventory、draw-shop 相邻合同，9 files / 96 tests，exit0；无 stderr 诊断；为满足 diff 空白门，文本去结尾空行，完整合并输出字节及 SHA 保留 targeted-process.json。
- `typecheck.txt`/`.exit`、`biome.txt`/`.exit`：game typecheck 与白名单/反控工具静态门，exit0、零诊断；typecheck-process.json 保留未归一化完整输出及 SHA。
- `mutation-runner.mjs`：在独立临时树读取真实源/测试运行原集合，再按 file×fullName 精确执行三态反控；只改临时树，源码未变。`mutation-raw/` 保留原 JSON/raw、execution identity、exit/signal、源/测试/重建 mutant hash、restored green 与 `cleanup.json` 的精确目录删除证明。3/3 指定业务 AssertionError 通过。
- `gate-check-docnav-failure`：第一轮全仓门在 evidence 导航遗漏处 fail，业务测试未执行；原件保留。
- `gate-check-content-hash-failure`：第二轮全仓门在 evidence 导航内容审阅 SHA 未同步处 fail，业务测试未执行；原件保留。
- `docs-preflight.txt`/`.exit`：补齐导航与内容审阅后文档门通过，1277 Markdown / 6789 links / 415 tasks、570 content-review documents，exit0。

测试质量复核：已删除与主测试同合同的 GLM 缩表用例；去两处无必要强转，以公共选择/确认入口替代直改 phase；拆开独立导航/意图/取消/刷新输入轴。确认导航逐操作断言防抵消，增表使用非零 cursor，数量均合法；typed catalog 使用物品 OBJECT ID，仅作菜单输入，不宣称是原始价格/flag。

全仓 `VITEST_MAX_WORKERS=1 pnpm check` 已完整 exit0，7 包 typecheck/test 与工具/文档门通过；game3569、editor4951、migrate739，最终 lint4047 files / 0 errors / 0 warnings / 0 infos，见 `gate-check.txt`/`.exit`。

历史 review 检查点：official `VITEST_MAX_WORKERS=1 pnpm coverage:ratchet` → `TYPE_PAL_COVERAGE_BASE_REF=origin/main VITEST_MAX_WORKERS=1 pnpm coverage:fast` 继续串行运行。两 coverage 门还未有 terminal receipt，不计通过；只有完成全部质量门并更新实际退出码后允许归档与关闭四条账本记录。其它 pending/review 保持原状态。

最终联合门均exit0：见CODE96的gate-check/ratchet/protected-fast（每门txt/exit/raw.json），最终file SHA snapshot与final-docs/lint/ledger回执。全量check、两个真正coverage门和静态零诊断通过才收口；仅关闭CODE93四条+CODE96两条，其他review/pending不变。用户指定停止后交GLM，候选CODE94/95全部独立门尚未完成，未合main。可读日志只去行尾/末尾空白，同名raw.json保留逐字输出/SHA。
```
<!-- incremental-original-source:end -->
