# QUALITY-SHOP-DEFINITION-OWNERSHIP-1 — 二阶段商店物品定义归属

Status: done
Phase: phase2
Capability: shop
Coding Owner: Codex（取证；产品build未准入）
Generation Owner: N/A
Reviewer: Codex
Visual Verification Timing: N/A（纯结算合同）
Branch: codex/code-quality-94-102

## 目标

二阶段商店请求未定义物品时，遵守shopBuy已有的null拒绝合同；不把JavaScript继承属性当物品定义。此卡仅取证，新的行为修复待用户裁决。

## 范围

shop.ts::shopBuy及必要专测/真实shopInput调用边界；不更改物品ID集合、商店schema、价格规则、存档、第一阶段菜单或其它Record消费者。

## 前提真值门

### 一句话行为 / 工程前提

合法空ItemDataMap与未知IDconstructor经过shopBuy，会返回money=NaN且添入虚假库存，而非null；源WorldState不变。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| primary source | 明示物品不存在返回null；物品来自ID定义表 | packages/content/src/shop.ts::shopBuy注释及items[itemId]查找 |
| 第一阶段 | N/A，本卡二阶段纯内容结算 | packages/content/src/index.ts公共出口 |
| 当前二阶段 | 货单只查ID字符串，当前runtime使用普通Object.fromEntries定义表；确认购买委托shopBuy | shop.ts::validateShops；reforge/project-loader.ts::indexById；reforge/menu/shop-box.ts::shopInput |
| 本任务目标 | 未定义必须拒绝；真正定义的同名物品仍可买 | 待用户批准；需正式红例和同名正控 |

### 反证与替代解释

最强替代解释是跨引用校验已拦截这类货单，因此普通工程不会触发。validate-refs使用Set可报告缺失物品，但不改变shopBuy公开的未知ID合同；本次未证明普通剧情或编辑器启动会绕过该报告，不冒称实际用户已受损。若空表未知ID实际返回null、同名存在是合法真实定义，或输入不属于公开函数域，则推翻/收窄相应结论。取证使用typed WorldState和空map，无核心mock/强转；失败为业务AssertionError，不是收集或环境失败。

### 用户可见偏离

before：继承constructor误算NaN；after候选：只有表中实际定义的物品可买，缺失返回null。用户裁决pending；产品实现未改。

## 上下文锚点

[二阶段边界](../../phase2/READ-FIRST.md)、[父审查](QUALITY-RECENT-200-CONTENT-AUDIT-2.md)、[八维规范](../code-quality.md)。与已批准的对话定义归属同族，但不把对话授权扩张成商店修复授权。

## 验收条件

正式shop.test.ts先加入未定义constructor拒绝与实际同名定义成功正控，保留红例原件，再获准修复；核shopInput结算调用，现有购买/卖出/不变性回归。A–H沿父卡记录，未修前shop.ts恢复review。不得新增ID黑名单、全局Object原型修改或忽略规则。

## 当前模式推进记录

2026-10-28 Codex：隔离同分支取证；probe原始代码/输出/失败和源码指纹写入父卡证据。产品build blocked，等待用户裁决。其它独立审核继续。

2026-10-28用户批准“按真实物品定义修复”。Codex build allowed限shopBuy自身属性归属及两正式反例/正控；单一Coding Owner Codex，同一治理树，不扩其它Record查找。正式红例先行，纯测试质量整理与产品修复分提交，等稳定大窗口再发布。

## Draft: 设计与风险

拟仅在shopBuy读取定义时确认自身属性，保持真正定义的同名内容；不擅改其它层。跨引用合法性与纯结算失败策略分开，普通工程可达性未证实。必要反例和相邻门通过后才可恢复原关闭信用。

## Build: 实现与自测

未改产品实现；定向probe业务反例已失败。正式测试与修复未执行。

## Review: 审查与返工

shop.ts当前review；父批其它文件不因本项撤回。统一门与集成均未授信用。

## 用户验收

pending。

## 交接日志

2026-10-28 Codex：validateShops接受constructor货单，shopBuy空定义表返回money=NaN；assert.equal(result,null)业务失败。原件归父卡native；不把NaN在JSON打印成null误认为返回null。

## 下一位 Agent 提示词

无，当前Codex继续；只暂停本项产品实现。

## 本片代码复验

2026-10-28：用户批准后的有限实现与正式测试代码接受；content1473例、相邻reforge36/editor31、相关typecheck与改动scoped静态零诊断（精确候选边界见父audit）。原失败/同名正控/错误假设撤回均保存。统一全仓/coverage/受保护发布仍待父窗口；卡维持review，不宣称已提交/推送/合并。

## 当前窗口代码收口

2026-10-28 Codex单Agent：153本轮主体＋前47有效复用＝200／200，原200复查排队0；不授其它pending信用。两已批归属修复正式红例／真实caller与相邻验证成立。全仓20506／typecheck／lint0；官方20157／810采集按包恢复，精确content重计与三退役快照后同报ratchet/protected0。失败原件和限制见父窗口audit；最后文档／静态回执及受保护PR发布事实另据实际命令，不提前冒称已推送/合并。无新增产品取舍。
