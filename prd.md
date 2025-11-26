# GST Return 软件 — PRD（产品需求文档）

## 1. 背景与目标（Why）
新西兰小企业/个体经营者做 GST Return 时，常见痛点：
- 交易分散在银行、收据、发票、手工表格里，整理耗时且容易漏。
- 报税期临近才整理，压力大、错误率高。
- 需要可追溯（audit trail）：每条交易对应凭证/来源，便于复核与会计沟通。

本产品目标：用“轻量、可追溯、可导出”的方式，把交易整理成可申报的 GST 汇总与报表材料。

> 备注：本软件不替代专业税务建议；提供计算与汇总工具，用户对申报负责。

## 2. 目标用户（Who）
- 主要用户：新西兰小企业主/自由职业者（GST registered）。
- 次要用户：记账人员/家庭成员协助整理。
- 典型场景：
  1) 日常随手录入/导入交易
  2) 报税期按日期筛选、核对分类、补齐凭证
  3) 一键生成 GST period 汇总 + 导出 CSV 给会计/自己填报

## 3. 产品范围（Scope）
### Must-have（MVP 必须具备）
1. 交易管理
- 新增/编辑/删除交易（默认软删除）
- 字段：日期、描述、金额（含/不含 GST 选择）、GST 金额（可自动算/手动改）、类型（收入/支出）、分类、商家、备注、凭证链接（可选）

2. 报税期筛选 & 汇总
- 选择 GST period（起止日期）
- 汇总显示：收入/支出小计、GST on sales、GST on purchases、净 GST（应付/应退）
- 显示计算口径说明（incl/excl、四舍五入规则、手动调整提示）

3. 导入/导出
- 导入 CSV（基础字段映射：日期/描述/金额/类型）
- 导出：交易明细 CSV + 报税期汇总 CSV

4. 审核与可追溯
- 每条交易显示来源（手填/导入/未来 OCR）、创建时间、最后修改时间
- 允许标记：已核对/待核对
- 基础搜索与筛选：日期、分类、类型、核对状态

5. 账号与数据隔离（如用 Supabase）
- 登录（Email magic link 或密码）
- 每个用户只能访问自己的数据（RLS）

### Nice-to-have（后续迭代）
- 收据上传 + OCR 抽取（未来接 n8n / AI）
- 银行自动同步（Open Banking/ APIs，合规后再做）
- 多实体（多公司/多 GST number）与团队协作
- 规则引擎（自动分类/供应商记忆）
- “异常检测”：重复、缺凭证、金额异常、GST 口径不一致

### Out of scope（本阶段不做）
- 直接向 IRD 自动提交
- 复杂税务判断（混合用途、私用比例、资本资产折旧等）
- 代替会计签字/税务担保

## 4. 核心用户流程（How）
1) 登录进入 Dashboard
2) 导入银行 CSV 或手工新增交易
3) 设置分类/类型、补齐 GST 口径、添加凭证链接（如有）
4) 选择报税期（起止日期）→ 查看汇总
5) 标记核对完成 → 导出汇总与明细 → 用于申报/交给会计

## 5. 关键页面与组件
1) Transactions 列表页
- 顶部：日期范围、类型、分类、核对状态筛选 + 搜索
- 表格：日期/描述/金额/GST/类型/分类/状态/操作
- 行内编辑或弹窗编辑（二选一，优先弹窗）

2) Add/Edit Transaction
- 表单校验（日期必填、金额必填、类型必填）
- GST 口径（incl/excl）切换
- GST 自动计算（NZ 标准 15% 默认；允许手动覆盖）
- 可附加：receiptUrl、notes

3) GST Return（Period Summary）页
- 选择 period 起止日期
- 展示：总收入、总支出、GST on sales、GST on purchases、净额
- 展示提醒：此处为辅助计算，申报以 IRD 要求为准
- 导出按钮：summary.csv / transactions.csv

4) Settings（可选）
- 默认 GST rate（默认 15%）
- 默认分类列表（可编辑）
- 导入映射模板管理（后续）

## 6. 数据模型（建议）
transactions
- id (uuid)
- user_id (uuid)
- date (date)
- description (text)
- type (enum: income|expense)
- amount (numeric)  // 以用户输入口径为准
- gst_mode (enum: incl|excl|none)
- gst_amount (numeric)
- category (text)
- vendor (text)
- receipt_url (text, nullable)
- notes (text, nullable)
- status (enum: pending|reviewed)
- source (enum: manual|csv|ocr)
- created_at, updated_at
- deleted_at (nullable) // soft delete

## 7. 计算规则（MVP 口径）
- 默认 GST rate = 15%（可配置）
- gst_mode:
  - incl：gst = amount * 3/23（常见算法），并允许手动调整
  - excl：gst = amount * 0.15
  - none：gst = 0
- 汇总：
  - GST on sales = sum(income.gst_amount)
  - GST on purchases = sum(expense.gst_amount)
  - Net GST = GST on sales - GST on purchases

> 备注：不同业务可能有零税率/免税/特殊情况；MVP 先支持手动覆盖 gst_amount，并在 UI 提醒用户核对。

## 8. 非功能需求（NFR）
- 性能：交易 5k 条内列表筛选顺畅（分页/虚拟列表可选）
- 可靠性：导入失败要给出原因与行号；不造成数据污染
- 安全：RLS 数据隔离；敏感信息不写入前端日志
- 可用性：手机也能操作（响应式）
- 审计：所有修改保留 updated_at，关键变更可选记录到 audit 表（后续）

## 9. 验收标准（Definition of Done）
- 能创建、编辑、软删除交易
- 能导入一份 CSV 并生成交易
- 能在任意日期范围生成汇总，且汇总与明细可导出
- 用户只能看到自己的数据（RLS 生效）
- 基本错误提示清晰（必填、导入格式错误、无数据等）

## 10. 风险与假设
- 风险：用户把“工具计算”当作税务保证 → UI 必须明确提示
- 风险：不同 GST 情况复杂 → 通过手动覆盖 gst_amount + 备注缓解
- 假设：MVP 用户可接受“先好用，再智能化（OCR/自动分类）”
