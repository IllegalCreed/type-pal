# C02 删除生命周期：完整窗口

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本页对应的原审计主题是 C02 删除生命周期完整窗口(源码候选 7433f71f555e457dd06f56122fa7273033f9bb4e,protected main f98d0ddd89ebdee7b04502ee35de26ee82c6d246,原件按固定main源逐字节保全)。本片三文件保持 review、0 关闭;只改测试及必要精确退役数据,未改产品/公共API/schema/save/资产管线。

## 范围与证据

门矩阵:pnpm check exit0(未包 act 2049/环境 577/导航 2)、pnpm coverage:ratchet --allow-scope-removal exit0(2076/584/2)、pnpm coverage:fast exit0(2081/584/2),G04 在三门均 0 诊断(与 C01 同为零)。七包 1640 文件/20270 测试通过(editor631/4947、game318/3564),七包 typecheck 通过;check 内 lint 4159 文件 0 error/0 warning/0 info;证据落盘后的 docs/lint/ledger 另记 postflight。官方 fast 736 源文件/19861 测试(editor4785),所有覆盖分子/分母及生产范围与前基线完全相同,只有 G04 10→9;精确身份/文件 SHA 与拒绝判据保持,确认版 ratchet 只确认这一条已审精简,普通 protected 未加 allow 参数——见 scope-proof.json、retirement-proof.json;所有 raw.gz 原始字节与 SHA 均核,五份源码整个窗口未变(window-snapshot.json/window-proof.json)。实际完整/部分读取与 SHA 见 read-boundaries.json;主 caller DataMode.tsx:693-720、BattleSpriteLibrary.tsx:698-731、BattleSpriteInlinePreview.tsx:184-238 与 cache/session 命令链;Primary 为 React 官方 act,阶段纪律为 phase2 READ-FIRST。

## 发现

逐文件结论与界限:①battle-sprite-harness.tsx 观察真实私有 cache/palette 调用返回的 Promise,默认 spy 透传,没有另造 decode 或替换核心;定制 source 保留 pending,卸载/挂载失败 finally 恢复 observer/DOM;异常清理无独立故障用例,历史 pending Promise 导航域待反证。②battle-sprite-ui.ts 目录单击仅执行一次,waitProof 等待实际资源,act 环境在 root 卸载后恢复;共享 caller 79→78 回归通过,但 G01/G02/G05 仍合计 535 条 act(next-read-boundaries 分解为 G01=111/G02=377/G05=47),其它 helper 工作流与全库排重未闭合。③G04 测试原十例先 404→340→234→0(baseline/host-only/host-ui/lifecycle 四件原件);合法初始 pending blob 与精确 sha 错误 oracle 补强,两个 mutant 旧绿/新恰一 AssertionError,最终九例完整恢复 0skip/0诊断;G04-04 磁盘 undo 全部业务 oracle 并入 G04-05 已有 redo 合同,不删除独立输入轴,未知外部重复不删。

## 结论

三门数值通过且 G04 与 C01 双零,但全仓仍 2049/2076/2081 条未包 act、577/584/584 环境、各 2 导航——统一零诊断门 NOT PASSED,不合 main、不宣布 94–102 或全仓治理完成;未运行剧情 E2E/视觉(纯测试 N/A),root check 中的 E2E-tools 单测不冒充剧情巡检。三文件仍 review,0 关闭,机器 3284/229 closed/51 review/3004 pending。

## 整改与复核

下一可直接继续范围:C02 共用驱动与 G01/G02/G05,先按新白名单建卡;只读准备与未证线索见 next-read-boundaries.json(含 proof-pending 缺受控 IO、图像/应用完成分离等待、导入/追加完成、原型资源 observer 旧资源导航、无存档宿主 location.reload 与原生锚点激活五条)。用户后续明确要求把 94、95、97–102 已发现问题全部修妥;当前卡属于全仓诊断阻塞,原产品停止线保持。无下一位 Agent 提示词,当前由 Codex 持续推进 goal。本治理候选仅覆盖文档角色与保全语义补写;候选待 Owner 接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2753B / SHA-256 7d712ce8dc4895a69116c145f228d75ab9b8081783af941a3eb4e21c6ac3199f；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# C02 删除生命周期：完整窗口

源码候选 `7433f71f555e457dd06f56122fa7273033f9bb4e`；protected main `f98d0ddd89ebdee7b04502ee35de26ee82c6d246`。

本片三文件保持review，0关闭。只改测试及必要精确退役数据，未改产品/公共API/schema/save/资产管线。

| 门 | exit | 未包act | 环境 | 导航 | G04 |
|---|---:|---:|---:|---:|---:|
| pnpm check | 0 | 2049 | 577 | 2 | 0 |
| pnpm coverage:ratchet --allow-scope-removal | 0 | 2076 | 584 | 2 | 0 |
| pnpm coverage:fast | 0 | 2081 | 584 | 2 | 0 |

七包1640文件/20270测试通过，editor631/4947、game318/3564；七包typecheck通过。
check内lint4159文件0error/0warning/0info；证据落盘后的docs/lint/ledger另记postflight。
官方fast736源文件/19861测试（editor4785），所有覆盖分子/分母及生产范围与前基线完全相同；只有G04 10→9。
精确身份/文件SHA与拒绝判据保持，确认版ratchet只确认这一条已审精简；普通protected未加allow参数。
见scope-proof.json、retirement-proof.json。所有raw.gz原始字节与SHA均核，五份源码整个窗口未变。

## 逐文件结论与界限

- battle-sprite-harness.tsx：观察真实私有cache/palette调用返回的Promise；默认spy透传，没有另造decode或替换核心。定制source保留pending，卸载/挂载失败finally恢复observer/DOM。异常清理无独立故障用例，历史pending Promise导航域待反证；review。
- battle-sprite-ui.ts：目录单击仅执行一次；waitProof等待实际资源；act环境在root卸载后恢复。共享caller79→78回归通过，但G01/G02/G05仍合计535条act；其它helper工作流与全库排重未闭合，review。
- G04测试：原十例先404→340→234→0；合法初始pending blob与精确sha错误oracle补强，两个mutant旧绿/新恰一AssertionError，最终九例完整恢复0skip/0诊断。04磁盘undo全部业务oracle并入05已有redo合同，不删除独立输入轴；未知外部重复不删，review。

实际完整/部分读取与SHA见read-boundaries.json；主caller DataMode.tsx:693-720、BattleSpriteLibrary.tsx:698-731、BattleSpriteInlinePreview.tsx:184-238与cache/session命令链。
Primary为React官方act，阶段纪律为phase2 READ-FIRST；没有一阶段机制或UI形态改变。
未运行剧情E2E/视觉（纯测试N/A）；root check中的E2E-tools单测不冒充剧情巡检。

统一零诊断门仍不通过，不合main、不宣布94–102或全仓治理完成。机器3284/229closed/51review/3004pending。
下一可直接继续范围：C02共用驱动与G01/G02/G05，先按新白名单建卡；只读准备与未证线索见next-read-boundaries.json。
无下一位Agent提示词，当前由Codex持续推进goal。
```
<!-- incremental-original-source:end -->
