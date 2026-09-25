# ARCH-REGRESSION-LAB-GLM-1 r9 独立接收

2026-09-26；隔离候选 `97e21f34`。结论：**accept 本轮 G05-02、G08-05/06 的候选测试合同**；这不是正式测试接入，也不代表十二组全合同或 V01–V04 矩阵完成。任务保持 `draft`，候选不合 `main`、不计官方覆盖率。GLM 为测试贡献者，以下为 Codex 独立复核。

## 范围与执行

- `e1857e66..97e21f34` 仅改本卡与 `docs/testing/glm-architecture-regression-lab/**`；最终工作树干净，`packages/`、`scripts/` 零 diff。
- 新鲜 `/tmp/codex-glm-r9-candidates.json` 为 37/37；`tools/verify.mjs` PASS，45 条机账为 43 candidate-green / 1 existing-proof / 1 blocked-environment，测试 fullName 双向映射成立。
- `tools/red-control.mjs` 五针均 detected：新 `g05-immediate-wait` 在候选 G05-02 业务断言红 `expected 'right' to be 'up'`；新 `g08-ignore-roots` 在 G08-06 红 `expected 1 to be 2`。两针各恰 exit1、目标套件实际执行、注入见证命中，均未改产品源文件；旧三针保持 detected。
- 独立 tsc、目录 Biome（含已提交执行 JSON）、`node scripts/docs/check.mjs`、`git diff --check` 均 exit0。六张未变截图不重拍；V01–V04 未证矩阵分类不变。

## 定点裁决

- **G05-02 accept。** `g05-playback-scope.test.tsx:63-82` 先零 tick 冲刷四个宏任务边界，再断言旧源仍处于 `facing=up/mode=running`，继而 tick 100ms、换源、固定推进 1200ms。生产 `ScriptRunner.runBody` 在每条命令的 gate/exec 间存在 await；这个冲刷让“停在尚未执行 wait 前”的 r8 假阳性失效。对宿主 `wait` 做单点立即完成变异后，测试在旧源朝向上业务红，证明当前挂起判别有鉴别力。
- **G08-06 accept。** `g08-conversion-isolation.test.ts:122-159` 使用四命令的 -2 表构造真实图地址空间；独占的全局根地址 3 使 `ownership` 从 `{scene:1,global:0,unreachable:3}` 变为 `{scene:1,global:1,unreachable:2}`。生产 `migrate-content.ts:2305` 把该根交给 `analyzeScriptGraph`；将其从图根剔除时，ownership 断言业务红，不再只是读取 `globalRoots.length` 的回显。
- **G08-05 收窄 accept。** 标题、机账及本轮回执均明确这是 `worldSpriteFrameCounts` 的转换前预检拒绝及去掉非法选项后可重试，不再宣称转换中段异常隔离。该用例仅按预检层合同接收。
- G01–G04、G05-04、G06、G07 的 r8 裁决不重开；G06 七入口完整矩阵、G08 其它 options 维度、V01–V04 操作矩阵仍未证。

## 非阻断的回执勘误

隔离回执的 r9 摘要和五针表正确，但 `receipt.md` 的启动小样行、G05 行、未证项末行及复算命令仍保留 r8 的“三针”/旧 tick 见证口径；`README.md` 交付登记仍标 r8 三针，`results.json` 的 red-control 命令注释也写三针。实际脚本、执行 JSON、机账测试映射与本轮业务结论一致，故不据此重开测试返工；**正式转正前必须把这些文字/命令注释改为五针与当前 G05 时序，再独立核对最终树**。`G08-05` 注释的“模块态无残留”也宜收窄为“预检拒绝后可重试”。

无下一位 Agent 提示词；候选转正、统一质量门与覆盖率并集仍由 Codex 另行核准。本轮不合候选、不代签、不标 done；Kimi 本队列豁免。
