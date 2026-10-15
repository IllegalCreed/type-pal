# CODE-QUALITY-91 evidence — game inventory-action menu contract

本批完整读取并核验三份 `inventory-action-menu` 白名单文件，生产实现未修改。证据链覆盖 SDLPal 一级物品框、真实 WORD id 22/23、static cursor 记忆、TS caller/state owner、shared selection primitive、renderer 与相邻 menu-driver oracle。

- `source-callers.txt`：白名单、真实生产 caller、公共出口/状态 owner、renderer oracle 与 SDLPal primary source。
- `targeted.txt`：白名单 + menu-driver + draw-menu 相邻回归，共 5 files / 85 tests，全部通过。
- `typecheck.txt`：`@type-pal/game` typecheck 通过。
- `biome.txt`：白名单与 mutation runner Biome check 通过，0 diagnostics。
- `mutation-results.json` 与 `mutation-raw/`：4 个精确变异均为业务 AssertionError，非 runtime error；恢复后全绿且源文件字节哈希一致。初次等价 Down→Up 变异已删除，不计有效针。

本批不关闭 `menu-driver.ts`、`inventory-menu.ts`、`equip-menu.ts`、`draw-menu.ts` 或 shared primitive；它们只作为 caller/oracle 与相邻回归。CODE-QUALITY-90 revive status boundary 仍 blocked，未触碰。
