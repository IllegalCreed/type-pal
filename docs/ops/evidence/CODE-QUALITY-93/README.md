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

全仓 `pnpm check` → official coverage ratchet → protected fast 仍按顺序运行；只有完成全部质量门并更新实际退出码后允许归档与关闭四条账本记录。未完成的其它 pending/review 保持原状态。
