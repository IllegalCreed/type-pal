# TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1 交付证据

MenuBox（`packages/reforge/src/menu/menu-box.ts`，源冻结 `9aa3bed892728f17c70d2f86d1fe07db10a718b8`）
未证明公开绘制合同的排重审计与 5 残余合同交付。逐合同账（source:line / 公开 caller /
合法输入 / 旧 fullName / oracle / 裁决）见[任务卡](../../tasks/TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1.md)。

## 交付物

- `packages/reforge/src/menu/menu-box.residual.glm.test.ts`（5 合同；typed MenuAssets/content
  fixture + renderSpans 调用记录 / drawImage 位图身份过滤 oracle，measureSpans 保持真实）。

## 反控（counterproof.json，sha256 `82d66154798e5833…`）

- `lib-isolated-tree.mjs`：隔离树（/tmp、node_modules 软链、冻结源逐文件 sha 校验）+ 双
  reporter（native JSON + default 同进程联判）+ 唯一判据（进程层/执行集逐字锁定/suite
  message 拒收/unhandled 拒收/红态跨文件恰一指定业务 AssertionError）+ 20 例合成反例
  judgeSelfTest。判据移植自 TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1 r2 定稿库，未放宽。
- `run-counterproof.mjs`：绿基线（五文件执行集 25 行锁定）→ 每针独立新树变异红 → 删树
  （清理证明落回执）→ 新净树还原绿（执行集与基线逐字一致 + 树内 menu-box.ts 还原 sha =
  冻结源）→ 工作树产品零残留。5/5 VALID。
- `mutation-logs/`：全部 native raw/JSON（trimEof 定稿、sha 按落盘字节、JSON 过 biome
  format）。

## 门禁原始输出

- `directed.raw`：工作树定向 5/5（EXIT=0）。
- `menu-suite.raw`：src/menu/ 全目录 106/106（EXIT=0）。
- `reforge-full.raw`：reforge 全包 359 文件 8963/8963（EXIT=0）。
- `typecheck.raw`：reforge tsc --noEmit EXIT=0。
- 根 `pnpm lint`（零诊断硬门）与 `pnpm check:docs` 见任务卡质量门节。

## 判例

- vitest json reporter `fullName` = describe 与 test 名空格连接；五文件执行集以
  `file :: fullName` 排序后三态逐字比对。
- 多次 `box.render` 断言间必须 `textCalls.mockClear()`——renderSpans 记录累加，`find`
  会命中上一相位的陈旧记录造成假红。
- 反控脚本被 biome format 后必须整体重跑（本目录证据为 format 后脚本的完整重放）。
