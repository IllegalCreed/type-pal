# CODE-QUALITY-91 evidence — game inventory-action menu contract

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE-QUALITY-91（game inventory-action menu contract 核验）证据目录的索引页,对应归档任务卡 docs/ops/archive/tasks/done/CODE-QUALITY-91-game-inventory-action-contract.md（done）。本批完整读取并核验三份 inventory-action-menu 白名单文件,生产实现未修改。证据原件即下方逐字节保全的固定main源(1184B,SHA a625b9a0fa70)。

## 来源与输入

来源为固定Git载体,非本次运行;本页正文无 markdown 链接(原0个链接,处置见作者review的linkDisposition)。真实内容:

- 证据链覆盖 SDLPal 一级物品框、真实 WORD id 22/23、static cursor 记忆、TS caller/state owner、shared selection primitive、renderer 与相邻 menu-driver oracle。
- source-callers.txt: 白名单、真实生产 caller、公共出口/状态 owner、renderer oracle 与 SDLPal primary source。
- targeted.txt: 白名单 + menu-driver + draw-menu 相邻回归,共 5 files / 85 tests,全部通过。
- typecheck.txt: @type-pal/game typecheck 通过。biome.txt: 白名单与 mutation runner Biome check 通过,0 diagnostics。
- mutation-results.json 与 mutation-raw/: 4 个精确变异均为业务 AssertionError,非 runtime error;恢复后全绿且源文件字节哈希一致。本轮核读四针身份: equip 丢 WORD id 22(红 [99,23]≠[22,23])、越界 defaultCursor 守卫放行(红 5≠+0)、Down 钳制不环绕(红 'use'≠'equip')、绕过 WORD 表用 fallback 文案(红 ['装备','使用']≠['装备X','使用X'])。初次等价 Down→Up 变异已删除,不计有效针。本体与 raw 副本字节相同。

## 断言与业务 oracle

文档事实核对(currentExecution=false):各记录按其自身字段成立。本批不关闭 menu-driver.ts、inventory-menu.ts、equip-menu.ts、draw-menu.ts 或 shared primitive——它们只作为 caller/oracle 与相邻回归。CODE-QUALITY-90 revive status boundary 当时仍 blocked,本批未触碰。空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;本轮语义整改把四突变身份、85 tests 范围与等价变异剔除事实写回可见正文,不重开任务、不重跑执行。不产生新执行结果。

## 限制与复核

未重跑原命令;历史结论保持原时点。各 *.txt 日志不在本轮1916候选集合内,数字按原文见证。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1184B / SHA-256 a625b9a0fa7012721a7b6a09675b67be11222849b0cccbe1e607c17a984d1fbd；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-91 evidence — game inventory-action menu contract

本批完整读取并核验三份 `inventory-action-menu` 白名单文件，生产实现未修改。证据链覆盖 SDLPal 一级物品框、真实 WORD id 22/23、static cursor 记忆、TS caller/state owner、shared selection primitive、renderer 与相邻 menu-driver oracle。

- `source-callers.txt`：白名单、真实生产 caller、公共出口/状态 owner、renderer oracle 与 SDLPal primary source。
- `targeted.txt`：白名单 + menu-driver + draw-menu 相邻回归，共 5 files / 85 tests，全部通过。
- `typecheck.txt`：`@type-pal/game` typecheck 通过。
- `biome.txt`：白名单与 mutation runner Biome check 通过，0 diagnostics。
- `mutation-results.json` 与 `mutation-raw/`：4 个精确变异均为业务 AssertionError，非 runtime error；恢复后全绿且源文件字节哈希一致。初次等价 Down→Up 变异已删除，不计有效针。

本批不关闭 `menu-driver.ts`、`inventory-menu.ts`、`equip-menu.ts`、`draw-menu.ts` 或 shared primitive；它们只作为 caller/oracle 与相邻回归。CODE-QUALITY-90 revive status boundary 仍 blocked，未触碰。
```
<!-- incremental-original-source:end -->
