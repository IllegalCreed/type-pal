# CODE-QUALITY-2b - shared YJ2 位流与回引边界

Status: review
Phase: phase1 shared
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Contributor: Codex
Branch: codex/code-quality-governance
Base: `e295d9804`
Worktree: `/Users/zhangxu/illegal/type-pal-code-quality`

> Q2 的 MKF/RNG 子批已收。本卡只收 `packages/shared/src/yj2.ts` 的 malformed 输入边界；
> `resources.ts` 与 `tables.ts` 是纯类型合同，已在逐文件账本登记为待核→本批核验，不改 schema 或生成物。

## 目标

让 YJ2 解压在位流截断、回引窗口落到输出之前或回引长度超过目标时显式失败；合法 raw、重叠回引和已有
early-EOS 零填充合同保持不变。

## 范围

- 范围内：`packages/shared/src/yj2.ts`、同域边界测试、shared/Q2 文档账本。
- 范围外：YJ1、MKF/RNG、资源类型、extract/game/reforge/editor、原始数据和生成产物。
- 明确不做：不把合法 early-EOS 改成必须填满；不增加任意尺寸上限；不降低 coverage/lint/typecheck 门。

## 前提真值门

- 一句话工程前提：YJ2 文件头给出输出长度，位流和回引参数必须在输入/输出边界内；当前 `bt` 对位流越界静默读 `undefined`，回引负窗口/超目标也可能静默写入零。
- 原版/primary：`reference/sdlpal/yj1.c:357-452` 的 YJ2 位读取、LZSS 回引与 `Length` 输出合同；C caller 只给真实压缩 chunk。
- 第一阶段：`packages/shared/src/yj2.ts:116-206` 被 pal-extract/game/migrate 共用；现有 fixture 钉住三字面、重叠回引、early-EOS。
- 当前二阶段：N/A；Reforge 仅消费已提取资源，不改变 codec 合同。
- 目标：坏位流/坏回引 fail-loud，合法输出逐字节不变。

### 反证与替代解释

- 最强替代解释：某些合法 PAL chunk 依赖源尾部读零或空窗口回引；直接跑 raw YJ2 census 与冻结向量验证，发现反例立即 rework/blocked。
- 可证伪观察：任一真实 raw digest、合法 fixture、early-EOS 输出改变，或生产 caller 依赖坏输入静默成功。
- 已排查：不改命令分类、地图/资源映射、生成物或测试 runner；只增加输入/目标边界失败 oracle。

## 上下文锚点

- `CLAUDE.md:31-38`：第一阶段 raw/SDLPal 参考和修根因边界。
- `reference/sdlpal/yj1.c:357-452`：YJ2 primary algorithm。
- `packages/shared/src/yj2.ts:116-206`：当前生产解码器与静默越界点。
- `packages/shared/src/yj2.boundaries.test.ts`、`rle.glm-o.test.ts`：合法/early-EOS/overlap 合同。
- 不得重新引入：未定义字节读取、任意 compatibility fallback、输出零填充冒充成功（early-EOS 是明确保留例外）。

## 验收条件

- 功能：位流读取越界、回引 `preStart < 0`、回引写出目标长度显式失败；合法真实 raw 与所有冻结向量不变。
- 测试：YJ2 定向、shared 全包、相邻 caller、全仓 check、ratchet、受保护 fast、lint；受保护 fast 若仍受 CODE-QUALITY-3c 阻塞，保留为独立未决，不降门。
- 文档：逐文件账本与治理路线同步；不改 `docs/testing/**`。
- 视觉/E2E：N/A。

## 当前模式推进记录

- Codex 范围/前提核验：verified（primary/raw/frozen oracle 已读，合法 early-EOS 明确保留）。
- Coding Owner / 白名单：Codex；仅 YJ2、同域测试、本卡/账本/治理/看板/索引。
- build 准入：Codex build allowed。
- 独立验收：pending（代码与 targeted/full check 已通过；待 official ratchet/protected fast 记录）。

## Build / Review

- 实现：`bt` 对位流 byte boundary 显式失败；回引起点为负或长度超过输出剩余空间显式失败；合法 early-EOS 仍保留零初始化尾部。
- 定向验证：YJ2/RNG/RLE 相邻 36/36；shared 全包 16 files / 131 tests；typecheck 通过。
- 真实 raw 对照：用旧实现 `e295d9804` 与当前实现逐字节比较 ABC/F/FBP/FIRE/MAP/MGO 及 RNG 内层共 2,626 段、34,367,608 字节；失败 0；SHA-256 `a66fbc5b55f324edba34e3c8b3304af64e412f07e3425d0cfd699ead160b9631`。
- 反控：临时移除三类 guard 后新增 malformed 测试有 4 条失败；生产文件已恢复，未把反控改动保留。
- 全仓 `pnpm check`：docs/tools、content 149/149、shared 129/129、game 3391/3391、pal-extract 417/417、reforge 8682/8682、editor 605/4844、migrate 95/723、lint 3196 文件零诊断通过。
- Official ratchet：已跑，shared 结果合法提升到 448/466 statements、204/218 branches、400/412 lines，但本次采样因独立 editor branch 24165/29058 对 24166/29058 差额失败；未更新 baseline。随后受保护 `TYPE_PAL_COVERAGE_BASE_REF=b9ba7e0fa pnpm coverage:fast` 采样到 editor 24166/29058，但因 shared test identity/digest 变化按合同要求先拒绝，提示 ratchet；未放宽门槛。
- 独立审查结论：代码候选可接受；Q2b 在 protected fast 记录完成前不标 done。

## 交接日志

- 2026-10-04 Codex：shared 逐文件复核后定位 YJ2 `bt` 与回引边界为剩余可执行风险；resources/tables/events/input/index/rle-encode 先按直接类型/合同证据核验，不扩大实现范围。Next: 增加坏位流与坏回引反例，保持合法 raw。

## 下一位 Agent 提示词

无；本批由 Codex 继续实现与独立验收。
