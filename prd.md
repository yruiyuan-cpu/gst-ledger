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


## v3 – GST period & Locking (2025-12-xx)

> 功能目标：为每个用户增加 GST 报税周期（monthly / two-monthly / six-monthly）和锁账机制，
> 并新增 /gst-return 页面查看每期的 GST 申报数据。

1. 背景与目标

当前项目已有功能：

从银行 CSV 导入流水到 public.expenses 表（包含 income / expense）。

Dashboard (app/page.tsx) 会统计：

Total spending

Total sales (GST-incl.)

GST helper（Total purchases & expenses / Total sales / GST on sales / Net GST）

已经有：

CSV 去重逻辑（同一条流水不会重复导入）

分类里增加了 IRD 相关类别：“Pay to IRD” / “Refund from IRD”

这两个 IRD 类别、以及 “Financial loan”“Owner’s funding” 默认 不含 GST；
其它类别默认 gst_included = true。

接下来要实现的基础版锁账机制 + GST 申报周期：

在“设置”中，用户可以选择 GST 申报频率：Monthly / Two-monthly / Six-monthly。

系统内部有一个 “GST Period（账期）” 的概念：

每个 period 有：开始日期、结束日期、状态（Open / ReadyToFile / Filed）。

Dashboard & /gst-return 页面的 GST 计算，都基于某一个 period。

当一个 period 标记为 Filed 后：

这段时间内的交易不允许再被修改/删除/新增（基础版可以先做到“禁止修改/删除/新增”，调整交易以后再做）。

用户在 Transactions 页面操作被拦截时，要有明显的提示。

增加一个专门的 GST Return 页面 /gst-return：

显示当前/选择的 period 的 GST 金额（类似 IRD 表格的结构）。

显示 period 状态，并提供按钮切换状态（Open → Ready to file → Filed）。

支持导出当前 period 的 CSV（PDF 可以先不做或留 TODO）。

重要：GST 计算公式要保持与现在一致，但要确保 IRD 相关类别（Pay to IRD / Refund from IRD）、贷款、Owner’s funding 不参与 GST 计算，只作为和 IRD / 银行的往来现金流。
Net GST = Output tax（销项） - Input tax（进项），不直接“减掉 IRD 退款流水”。

2. 数据模型设计
2.1 新表：public.user_settings

用于保存每个用户的 GST 报税频率。

请在 Supabase SQL Editor 里创建（也可以写在 docs/agent.md，方便人工复制执行）：

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gst_frequency text not null default 'two-monthly' check (
    gst_frequency in ('monthly', 'two-monthly', 'six-monthly')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_settings_user_id_idx
  on public.user_settings(user_id);


将来如果有更多设置，也可以加到这个表里。

新用户第一次访问时，如果没有记录，可以自动插入一条默认 two-monthly 的设置。

2.2 新表：public.gst_periods

用于记录每一期 GST 账期及其状态。

create table if not exists public.gst_periods (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'open' check (
    status in ('open', 'ready_to_file', 'filed')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, start_date, end_date)
);

create index if not exists gst_periods_user_date_idx
  on public.gst_periods(user_id, start_date, end_date);


约定：

每个 user 在任意一段 [start_date, end_date] 上最多一条记录。

一个账期的状态只存在这张表中，不写到交易表里。

基础版不强制生成整年的全部 period；只要：

当前 period 存在即可；

访问 /gst-return 时，如果对应 period 不存在，可以自动创建。

账期起止的计算方式见后面的 “Period 计算逻辑”。

2.3 现有表 public.expenses 保持不变

但 GST 计算时要确保排除以下类别：

Category 属于 “Financial loan”“Owner’s funding”“Pay to IRD”“Refund from IRD”。

已经有的类别映射逻辑在 lib/categories.ts / lib/bank-import.ts 中，请复用。

3. Period 计算逻辑（核心规则）

写在一个新的工具文件里，比如：lib/gstPeriods.ts，导出以下工具函数（TypeScript）：

export type GstFrequency = 'monthly' | 'two-monthly' | 'six-monthly';

export type GstPeriodStatus = 'open' | 'ready_to_file' | 'filed';

export interface GstPeriod {
  id: number;
  user_id: string;
  start_date: string; // ISO date
  end_date: string;   // ISO date
  status: GstPeriodStatus;
}

3.1 根据 frequency + 基准日期 计算账期范围

实现函数：

export function getPeriodRange(
  frequency: GstFrequency,
  baseDate: Date
): { start: Date; end: Date };


规则：

monthly：当月 1 日 ~ 当月最后一天。

two-monthly：以奇数月份为起点：

1–2 月、3–4 月、5–6 月、7–8 月、9–10 月、11–12 月。

例如 baseDate 在 2025-11-15，则 period = 2025-11-01 ~ 2025-12-31。

six-monthly：

1–6 月、7–12 月。

end 为该 period 的自然月末（不是今天）。

3.2 获取 / 自动创建当前 period 记录

实现：

export async function getOrCreateCurrentPeriod(
  supabase: SupabaseClient,
  userId: string,
  frequency: GstFrequency,
  baseDate: Date
): Promise<GstPeriod>;


逻辑：

通过 getPeriodRange 算出 start、end（date，只要年月日）。

查询 gst_periods 是否已存在该 user 的 [start_date, end_date]：

存在 → 返回。

不存在 → 插入一条 status = 'open' 的记录再返回。

3.3 根据日期查询所属 period 的状态

用于锁账校验：

export async function getPeriodStatusForDate(
  supabase: SupabaseClient,
  userId: string,
  date: Date,
  frequency: GstFrequency
): Promise<GstPeriodStatus | null>;


简单做法：

计算该日期对应的 period 范围 [start, end]。

查询是否有 gst_periods 记录：

有 → 返回 status。

无 → 视为 open（可以选择直接返回 'open'，也可以返回 null；推荐 'open' 以简化调用）。

4. GST 计算调整

在 lib/utils.ts（或当前负责 GST summary 计算的文件）中：

确认已有一个用于计算 dashboard / helper 的函数，例如：

export function calculateGstSummary(expenses: Expense[]): {
  totalSpendingInclGst: number;
  totalSalesInclGst: number;
  gstOnSales: number;
  gstToClaim: number;
  netGst: number;
}


更新逻辑，确保：

IRD 相关类别（Pay to IRD / Refund from IRD）、

Financial loan、

Owner’s funding
这些类别在计算 Total purchases & expenses、Total sales、GST on sales、GST to claim、Net GST 时都被排除。

推荐做法：

在 lib/categories.ts 中，为每个 category 定义一个属性 includeInGst: boolean；

GST 计算时，只考虑 includeInGst === true 的交易。

Net GST 公式：

gstOnSales = sum( salesWithGst ) * (3/23) 或当前项目使用的等价逻辑；

gstToClaim = sum( expensesWithGst ) * (3/23)；

netGst = gstOnSales - gstToClaim；

IRD 退款那笔 9,132.43 不应该改变 netGst，只在现金流视图中存在。

把这个 summary 函数抽象为可以接受 “时间范围” 参数：

export async function getGstSummaryForRange(
  supabase: SupabaseClient,
  userId: string,
  from: Date,
  to: Date
): Promise<GstSummary>;


在内部从 public.expenses 按 user_id + date between from and to 读取数据，

再用统一逻辑计算 summary。

Dashboard 当前的 GST helper & Net GST 卡片，应该调用 getGstSummaryForRange，
且 date range 使用 “当前账期”的 start/end（由 getOrCreateCurrentPeriod 提供）。

5. UI / 页面改动
5.1 设置页：选择 GST frequency

如果项目已有设置页面，请在原页面上修改；如果没有，请创建：

路径：app/settings/page.tsx。

内容：

一个简单的 card，标题 “GST settings”。

一行 “GST filing frequency” + 下拉框：

Monthly

Two-monthly

Six-monthly

下方 Save 按钮。

行为：

页面加载时，从 user_settings 读取当前用户的 frequency 显示在下拉框。

点击 Save 时：

调用 server action / API 更新 user_settings 中的 gst_frequency。

成功后给一个绿色 toast / banner 提示。

导航：如果项目有顶部导航，请在合适位置增加一个 “Settings” 链接指向 /settings。

5.2 新增 /gst-return 页面

文件：app/gst-return/page.tsx（server component + 可以包含 client 子组件）。

功能：

在顶部展示：

一个 period 选择控件（当前只需要支持：当前 period + 前一个 period 即可，或简单从 gst_periods 查询最近几条）。

当前选中 period 的日期范围：例如 2025/11/01 – 2025/11/30。

当前 period 状态 badge：Open / Ready to file / Filed。

中间展示 GST Summary（类似现在 Dashboard 中的 helper 卡片），包括：

Total purchases & expenses (GST-incl.)

Total sales (GST-incl.)

GST to claim (input tax)

GST on sales (output tax)

Net GST（标注清楚是 “This period”）。

数据来源：调用 getGstSummaryForRange，range 使用该 period 的 start/end。

状态切换按钮：

当状态为 open：

显示按钮：Mark as Ready to file。

当状态为 ready_to_file：

显示按钮：Mark as Filed 和（可选）Back to Open。

当状态为 filed：

显示：Filed on <date>，按钮可选只保留 Back to Ready to file 或不允许回退（基础版可以允许回退）。

实现方式：

在 app/gst-return/actions.ts（或类似位置）创建 server action：

updateGstPeriodStatus(periodId, newStatus)：

更新 gst_periods.status + updated_at。

前端按钮调用这个 action，成功后刷新当前页面（或只刷新页面 state）。

导出 CSV 按钮：

在 summary card 上方或右上放一个 Export CSV 按钮。

点击后：

生成一份当前 period 的 CSV，包含：

所有参与 GST 计算的交易（排除 IRD / loan / owner’s funding）。

每行包含：Date, Category, Description, Amount, GstIncluded, GstPortion, Type（income/expense）。

用 Content-Disposition: attachment; filename="gst-return-YYYYMM.csv" 的响应方式下载。

可以通过一个新的 app/gst-return/export/route.ts（route handler）来实现。

5.3 Dashboard 调整

文件：app/page.tsx

目标：Dashboard 上的

Total spending

GST helper 区块

Net GST 卡片
都要基于 “当前 GST period” 的数据，而不是简单的 “This month” date range。

实现建议：

从 user_settings 读取当前用户 gst_frequency。

使用 getOrCreateCurrentPeriod 获取当前 period 的 start/end。

调用 getGstSummaryForRange 获取 summary。

将当前 period 的日期范围显示在 GST helper 区域下方，例如：

“Statement period: 2025/11/01 – 2025/11/30”（与现在类似）。

Net GST 卡片可加一行小字：This period (frequency: Two-monthly) 等。

此外：

点击 GST helper 区域或 Net GST 卡片时，跳转到 /gst-return 并默认选中当前 period。

6. Transactions 页面 + 锁账控制

文件：app/transactions/page.tsx 以及相关的 server actions / lib 函数。

6.1 识别所选日期属于哪个 period

在新增 / 编辑 / 删除一笔交易时，需要知道该交易的日期 tx.date；

从 user_settings 拿到 frequency；

调用 getPeriodStatusForDate(userId, tx.date, frequency)。

6.2 锁账规则（基础版）

如果返回的 status 为：

'filed' → 禁止：

新增在该日期内的交易；

修改该日期内已有交易；

删除该日期内已有交易。

'ready_to_file' → 允许修改，但必须提示确认（可选，基础版可以先不做确认，只做 filed 的禁止）。

违规时：

后端 server action 抛出一个带 message 的错误，例如：

"This GST period has been filed. Changes are not allowed. Please create an adjustment in a later period instead."

前端在表单上显示这个错误（使用项目现有的错误提示方式）。

重点：必须从后端做校验，不能只在前端拦截，否则用户绕过 UI 仍可写入已锁期间的数据。

6.3 Transactions 页面的导入提示已就绪

现在 /transactions 在 URL 上支持 ?imported=X&skipped=Y，顶部有绿色 banner 提示：

Bank statement import finished: X transactions added, Y duplicates skipped.
这一点不需要再改，只要保持。

7. 需要修改 / 新增的文件列表（大致）

请用你自己的代码搜索确认命名，这里是预期的文件位置和作用：

已有文件（需要修改）

app/page.tsx

Dashboard 使用当前 GST period 的 summary。

app/transactions/page.tsx

顶部 filter 已存在，继续沿用；

在新增/编辑/删除操作中接入 period 锁账判断；

保持 import success banner 逻辑。

lib/utils.ts

统一 GST summary 逻辑（排除 IRD / loan / owner’s funding）。

提供 getGstSummaryForRange 等函数。

lib/categories.ts

为 category 增加 includeInGst 标记；

确认 IRD / loan / owner’s funding 类别标记为 false。

lib/dateRange.ts（如存在）

可以复用内部的 “month 起止日期” 辅助函数；

若有需要，为 period 计算提供工具。

lib/bank-import.ts

仅需小幅调整以保持与新的 category / GST 标记一致；

无需改去重逻辑。

新增文件

lib/gstPeriods.ts

实现本 PRD 中描述的 period 计算与查询工具。

app/settings/page.tsx（若没有已有设置页）

用户设置 gst_frequency 的 UI + server action。

app/gst-return/page.tsx

GST Return 主页面。

app/gst-return/export/route.ts（或类似路径）

导出当前 period 的 CSV。

app/gst-return/actions.ts（可选）

period 状态更新的 server actions。

SQL / 文档

docs/agent.md 或 README.md

记录本次 schema 变更：user_settings + gst_periods 建表语句；

并说明锁账规则和 GST 计算的排除类别。

8. 验收与测试场景

实现完毕后，请帮我在 PR 说明中写出以下测试步骤，并自行在本地验证：

频率设置

初次访问 /settings 时，默认看到 “Two-monthly”。

修改为 “Monthly”，保存，刷新页面仍然是 Monthly。

当前 period 计算 & Dashboard 一致性

假设今天在 2025-11-15：

Monthly → period = 2025-11-01 ~ 2025-11-30；

Two-monthly → period = 2025-11-01 ~ 2025-12-31；

Six-monthly → period = 2025-07-01 ~ 2025-12-31。

Dashboard 的 “Statement period” 与 /gst-return 选中 period 的日期一致。

GST 计算排除 IRD / loan / Owner’s funding

插入一笔 IRD 退款（Refund from IRD）9,132.43：

Dashboard 的 Sales / GST on sales / Net GST 不应该因为这笔而减少。

插入一笔 Owner’s funding：

Spending / GST summary 不变化（除非另有逻辑）。

锁账行为

把当前 period 状态设为 Filed：

在 /gst-return 中可以看到状态 badge 为 Filed。

尝试：

在该 period 范围内新增一笔交易 → 应失败，并有错误提示。

编辑该 period 内已有交易 → 应失败，并有错误提示。

删除该 period 内交易 → 应失败，并有错误提示。

在下一期 / 未锁账的日期内新增交易 → 正常成功。

CSV 导入 + 去重

再次导入同一份银行 CSV：

/transactions 顶部 banner 显示 “no new transactions, X duplicates skipped”；

交易数量不增加；

若 CSV 中包含已 Filed period 内的交易，也应被拒绝或按去重 / 锁账规则处理（说明清楚当前行为）。

导航体验

点击 Dashboard 上的 Net GST / GST helper，可以跳转到 /gst-return 当前 period。

切换 period 后，summary 和状态显示跟随变化。
