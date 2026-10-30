# CODE-QUALITY-105 — Codex 当前验收（2026-10-17）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「CODE-QUALITY-105 — Codex 当前验收（2026-10-17）」的治理候选页;证据原件即下方逐字节保全的固定main源(2293B,SHA 763f5039c98f)。

## 来源与输入

来源为固定Git载体,非本次运行;原0个链接处置见作者review的linkDisposition。当前存活入口:无当前仓库内存活链接。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2293B / SHA-256 763f5039c98fc389e749eb59551588999096cc82978a6e2005184798bcbce1d7；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-105 — Codex 当前验收（2026-10-17）

## 文件与生产链

完整读取 `menu-box.residual.glm.test.ts`、`menu-box.ts`、四个相邻 MenuBox 测试、
`menu-state.ts`，以及 `main.ts:5159` 的构造和 `main.ts:5872` 的 `menuBox.render`
调用。生产公共入口为 `MenuBox.render`；菜单状态来自 `openMenu`/`moveCursor`/`confirm`，
状态页数据来自 typed `WorldState`/`CharacterInstance`，装备效果走 `effectiveStat`。

## 五个合同

R1 验证两级框几何、CASCADE 偏移、金额卷轴和右对齐数字；R2 验证闪烁相位回绕、系统面板
静态高亮和禁用选中；S1 验证九行顺序、坐标、蓝/青最大值和装备加成；S2 验证名字/立绘
中心定位；S3 验证六格、图标缩放、物名和空槽跳过。所有输入都使用 typed fixture，oracle
记录 `renderSpans` 与按位图身份过滤的 `drawImage`，没有 mock 私有业务状态。

相邻四文件分别覆盖数字/卷轴/确认框、九宫格阴影/退化输入、状态板毒/头像/阈值/图标和资源
失败；旧断言没有覆盖本批的坐标、空槽或相位臂。历史归档反控只作为候选，当前源树已重放
K1–K5 并逐针得到 red + restored green，未修改历史日志。

## 当前验证

- 定向五文件：25/25 PASS，0 本批 stderr。
- menu 目录相邻：21 files / 118 tests PASS，但 `reward-gain-queue.boundaries.test.ts:100`
  有未 await `expect(...).resolves` 未来兼容诊断；该文件不在白名单，保持开放。
- `pnpm --filter @type-pal/reforge typecheck`：PASS。
- `menu-box.ts` 当前 SHA：`9c7c7b569e035fe5771fce79e5549e34aea1d66b7577569b2a6d98962ffcf2c1`，
  与历史冻结源一致。
- 本批不改生产行为、schema/save、公共接口、生成物、coverage 配置或 baseline。

## 裁决

五个合同测试和反控判据足以证明该测试文件不是空测或重复包装，当前未发现应修复的业务缺陷。
由于相邻包仍有未 await 诊断，且统一 coverage ratchet/protected fast 继续复现 shared/pal-extract
与 total baseline 回退，本文件登记 `review`，不标 `已验证`。后续可直接继续相邻 Vitest
诊断的最小文件批次，修复前先保留失败诊断，再跑定向、相邻和全仓门。
```
<!-- incremental-original-source:end -->
