# game-inspect-save-analytics(inspect + save + analytics 七文件)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 11 批 27
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 60+ 提交)
- Coding Owner:GLM;七文件全文读毕(battle-inspect 399/save-api 99/indexed-db 111/install-analytics 64/analytics-consent 90/analytics-consent-ui 124/google-analytics 147)
- **零整改批**(B–H 全维通过;零代码/注释改动,工作树零 diff)

## 零整改依据

- **battle-inspect.ts**:双消费方(dev-panel entries / 工具面板 statuses)职责注、E04 隐藏经验池/灵葫值=0 不可收/attackEquivItem rate 语义(带 sdlpal fight.c 锚)、slow 无 persistentIndex(非持久 status)与 player-poison-state 模型一致 — 全部锚准确。
- **save/api.ts + indexed-db.ts**:双路径门面(含 2026-10-15 旧"stub"注更正史)、P2#5 DB_VERSION=2 清档理由(local→global ip 不兼容)、commitWrite 的 oncomplete 才算提交/abort 传播原始 error 论证(IDB 语义正确)。
- **analytics 四件**:consent 三态+隐私信号默认拒、gtag dataLayer 原样入队(biome-ignore 有正当理由)、sanitizePageViewUrl 只保 utm 四字段+token 白名单、install/GA 创建者两级回滚职责划分 — 全部准确。

## 验证

- 定向 9 文件(inspect×2/save×2/analytics×5):**20 套件 50/50,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/game`:exit 0;工作树零 diff

## 登记项

无新增。
