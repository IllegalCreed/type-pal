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
