# 提取器共享输出边界 C1 反控

范围为 `packages/pal-extract/src/cli.ts` 清理入口与 `cli-error-exits.kimi-r1.test.ts` 临时树反例。真实 caller 是根 `pnpm extract` 调用包内 `tsx src/cli.ts`；输出固定为仓库 `data/extracted`，原盘 `data/raw` 只读。用户已批准方案 A：共享 `data` 或 `data/extracted` 节点为 symlink 时，创建/清理前拒绝；普通自有输出、只读 raw 链接和 OUT 内部子项链接保持原行为。

## 旧实现红回执

`red.json`、gzip raw/runner 保存完整命令、cwd、exit、file×fullName、SHA。删除 guard 的旧实现变异仍是9 tests 中原7例通过、两个新增共享输出场景各一个 AssertionError，0 pending、0 stderr block；两个临时树均观察到共享目标 marker 被清除，证明字符串 suffix guard 没有验证输出所有权。正式源在反控 finally 中逐字节恢复。

测试输入来自公开 CLI 子进程入口，使用真实临时目录、真实 symlink、marker 字节和缺失 SSS 的 fail-after-clean 路径；没有触碰工作树 `data/extracted`，没有生成物修改或主流程 mock。后续绿回执必须同时保持既有普通清理/videos 保留、OUT 内部子项 symlink 只 unlink 其自身、共享根/父链接 marker 保留，并核错误在输入读取前出现。

guard 实现后的 `green.json` 为9/0/0，pal-extract package typecheck+72 files/434 tests 通过；普通OUT/videos、raw读取和已有错误合同保持。当前只收口本卡白名单，不证明全仓完成；coverage baseline 回退、game stderr 与 editor runtime diagnostics 仍是统一收口风险。

## 本批质量门回执

- 全仓 `pnpm check`：通过；editor 631 files/4943 tests、migrate 96 files/739 tests，末尾 lint 4959 files，0 error/0 warning/0 info。
- `pnpm check:docs`：通过；1467 Markdown / 8696 local links，document model 0 issues，testing docs 0 issues，phase/lore 184 documents，content review 2340/2340。
- `pnpm lint`：通过；4959 files，0 error/0 warning/0 info。
- `node scripts/quality/code-quality-ledger.mjs`：通过；3307 tracked，226 closed / 10 review / 3071 pending。
- `pnpm coverage:ratchet` 与 `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`：均按真实基线门失败，未修改 baseline。shared 为 statements 447/466、branches 203/218；pal-extract 为 statements 1068/1546、branches 461/593、functions 111/140、lines 943/1367。

本批实际读取与核验文件为 `packages/pal-extract/src/cli.ts`、`packages/pal-extract/src/cli-error-exits.kimi-r1.test.ts`、其真实 `pnpm extract` caller、相邻 pal-extract 测试与输出/原盘边界；未触碰 schema/save、公共接口、生成物或主工作树。下一候选是 game 17 块 stderr 与 editor 剩余运行时诊断的逐文件归因，以及其余83张94前卡的有限切片；共享覆盖率基线回退仍保持未决。
