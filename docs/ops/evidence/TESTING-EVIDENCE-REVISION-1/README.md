# E2E 版本适用性替代日历期限

Status: current
Owner: Codex
Last reviewed: 2026-10-30
Template: governance-index-v1 / 1.0.0

## 目的

执行用户裁决：取消任意日期驱动的循环复核／重跑，以真实候选、内容／存档版本和相关源码指纹判断旧证据的适用边界。[任务与授权](../../tasks/TESTING-EVIDENCE-REVISION-1.md)、[长期规则](../../../testing/governance.md#版本适用性)。

## 范围

20个catalog条目只移除活动reviewBy，6个阶段入口同步；现行模板与两个索引视图跟进。状态、lastVerified、revision、sourceRefs、全部配对报告及机器执行对象不变，旧到期／续期保留历史。不是重新执行E2E，也不关闭174命名主体。

## 当前状态

原合法无reviewBy的阶段反例先在旧门指定失败，再修。定向21工具合同通过且stderr空；缺记录不判matching，content/save/source变化各独立辨别，无关HEAD变化不判过时。真实只读对比001显示SAVE11→12为changed，其余历史身份未刷新。完整文档工具131/131、check:docs全部子门0issues且stderr空，lint-zero6230文件0error/0warning/0info；详见[机器回执](review.json)及完整原件，未运行全仓产品check／官方coverage／protected。

## 入口与责任

- `node scripts/docs/testing-revisions.mjs`：只读比较六阶段；可加稳定ID。
- `node docs/ops/evidence/TESTING-EVIDENCE-REVISION-1/verify.mjs`：核精确输入／当前边界、旧报告保全、真实红绿原件；不自动跑E2E。
- [冻结输入](before.json.gz)与[完整执行原件](raw.json.gz)由review.json校验hash。旧001发布复核继续核当时冻结边界；本政策另核当前字节，不能抹掉历史失败或把旧续期当现行规则。

八维逐项检查：

| 文件／范围 | A正确性边界 | B注释 | C职责耦合 | D复用 | E测试判别力 | F可读性 | G简洁性 | H可测试性 |
|---|---|---|---|---|---|---|---|---|
| check-testing.mjs | 仅退休期限；源码、依赖、配对、artifact门保留 | 退休提示明确 | 日期只供独立legacy迁移规则 | 沿用现有revision/sourceRefs | 合法无期限红例及独立未来期限拒绝 | 诊断直述字段 | 删除无用today参数 | temp根可独立验证 |
| check-testing.test.mjs | 合法阶段fixture来自真实配对合同 | 旧expired标题纠正 | fixture限临时根，逐例清理 | 沿用pairedFixture | 不是退出码断言；核精确业务诊断，旧漂移／runtime假报反例保留 | 状态／日期语义显式 | 仅补1个合同，不堆用例 | 无全局时钟／网络 |
| generate-testing-index.mjs | 原九视图成员不变，追加记录版本投影 | 不授执行信用 | 纯renderer与writer边界保持 | 从catalog投影，未建第二账 | 独立行oracle及真实writer/CLI保留 | 记录版本单独表 | 只改两视图，不新造索引 | 不读时钟、不改输入 |
| testing-index-governance.test.mjs | 原身份/状态/链接及9输出断言保留 | 明确独立行读取 | 只核producer职责 | 沿用真实临时writer根 | 新版本投影改变42/13仍保rework；旧whole-file反控保留 | 对照具体字段 | 未删除旧断言，审查日期按视图区分 | 源对象不变／幂等合同继续 |
| testing-revisions.mjs | changed/unknown/matching分开；HEAD不同不单独失效 | 匹配只覆盖声明边界 | 纯比较与薄IO入口，零写入 | 复用catalog和当前canonical版本常量 | 三相关维度、缺失与真实CLI测试 | differences/missing列明原因 | 无新数据格式／状态账／定时器 | 纯输入Map可确定性反证，IO根可传入 |
| testing-revisions.test.mjs | 明确合法记录与历史执行日期 | 标题不冒称全闭包 | 独立纯fixture，CLI只读 | 不复制比较算法当oracle | 具体差异对象＋精确缺失＋未知ID拒绝＋catalog字节不变 | 每例一类合同 | 4例覆盖不同轴 | 无产品mock／等待／共享写入 |
| frozen-binding-baseline.test.mjs | 仅删退休参数，原非法publication拒绝仍在 | 无新增主张 | 原真实consumer不变 | 不引兼容入口 | 复用完整相邻工具回归 | 调用匹配现接口 | 删除无效第三参 | 原隔离保持；仅增量，不计全文闭合 |
| 阶段／规范／模板／证据桥 | 历史业务对象精确保全 | 旧日期标历史 | governance唯一政策源 | 使用现有字段／固定归档 | 精确hash＋entries逐字段守恒＋原件复验 | 当前规则与旧记录分开 | 不改旧报告，不增加runner | 两只读verifier可低成本复验；辅助桥不计主体 |

## 证据与下一步

原失败calendar-red、首轮两项导航诊断（仅会话工具输出，未保存原始字节）、content-first指纹拒绝及完整后续运行分别披露；不将首轮退出0的格式修复描述为最终零诊断。原ledger新行最初误落非消费尾部，机器计数拒绝后已移入唯一连续表，未改parser。收口后终态卡仍留活动看板被docs-final正确拒绝，已从活动看板移除，任务仍原位保留并进入生成完成索引。临时finalize辅助脚本完成写入后因错误读取goal字段报错（仅会话工具输出），改为真实completedFG字段后通过；辅助脚本不作为业务门信用。

Owner为单一Codex，记录为作者自验，不冒称第二Agent独立签名。本政策完成不消除006真实rework，不升级旧SAVE11为当前前驱，也不替后续实际相关改动的影响判断。主命名goal保持42/174、余132；两个新工具review、旧门撤review等大批代码门，0新增closed。
