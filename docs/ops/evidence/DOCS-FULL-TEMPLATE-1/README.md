# DOCS-FULL-TEMPLATE-1 盘点证据

## 证据身份
2026-10-11；Owner: Codex；status: recorded；静态枚举，非内容深审。

## 来源与输入
源树 `/Users/zhangxu/illegal/type-pal`，HEAD `9aa3bed892728f17c70d2f86d1fe07db10a718b8`。完整原始字节计算 SHA；Git tracked/visible 与磁盘 physical 分列。

## 断言与业务 oracle
每个磁盘文件只列一次；候选扩展名为 Markdown/JSON/HTML；原绑定仅作 inherited-unrevalidated，不继承 reviewed。

## 结果
[inventory.json](inventory.json) 含逐文件清单、旧绑定、未绑定、解析结构和漂移；[protection.json](protection.json) 含四个保护文件的起始 hash。

## 限制与复核
标题和 JSON keys 仅供阅读排期，不能替代全文语义阅读。artifact owner 全部待核，不以目录猜 owner。候选工作树不含用户 draft 的正文；接收前必须重新核原树 delta。本轮无 runtime/E2E/视觉/coverage 结论。
