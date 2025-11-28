# Agent Guide — GST Return App（执行规则）

你是本仓库的工程执行代理（coding agent）。目标是：在不偏离 PRD 的前提下，快速交付可运行、可测试、可维护的功能。

## 0. 优先级（必须遵守）
1) prd.md 的范围与验收标准 > 现有代码约定 > 你的偏好
2) 安全与数据隔离（RLS/权限）优先于“省事实现”
3) 默认不做破坏性变更（尤其是删除数据、改表结构）除非明确包含迁移与回滚方案

## 1. 工作方式（每次输出必须包含）
- 变更摘要（做了什么）
- 文件清单（改了哪些文件）
- 如何测试（具体命令 + 预期结果）
- 若有假设/不确定：写清假设，不要装确定

## 2. 架构与技术栈（如仓库已有则遵循现状）
- Next.js（App Router）+ TypeScript + Tailwind（如已使用）
- Supabase（Auth + Postgres + RLS）
- 表单校验建议用 Zod（如已有）
- 禁止引入“大而全新框架”导致复杂度暴涨

## 3. 数据与安全规则
- 所有 queries 必须带 user_id 过滤，且数据库启用 RLS：
  - SELECT/INSERT/UPDATE 只允许 auth.uid() = user_id
- 删除交易采用 soft delete（set deleted_at），UI 默认不展示 deleted_at 非空
- 不在前端存储任何敏感 key；只使用 public anon key（如 Supabase）

## 4. 业务规则（与 PRD 对齐）
- gst_rate 默认 15%
- gst_mode: incl / excl / none
- 允许用户手动覆盖 gst_amount（并在 UI 给提示）
- 汇总逻辑严格按 PRD（income/expense 分开累计）

## 5. 代码质量门槛
- TypeScript 不允许明显 any 滥用
- 关键逻辑（GST 计算/汇总/导入解析）必须写单元测试或至少可复用纯函数 + 基础测试
- UI 变更要兼容移动端

## 6. CSV 导入规则
- 导入必须：
  - 显示导入预览（或至少提供导入统计：成功/失败/失败原因）
  - 能定位错误行
  - 支持重复防护（最小版：提示“可能重复”，后续再做 hash 去重）
- 导入解析逻辑必须独立成纯函数，便于测试

## 7. UX 规则（避免用户踩坑）
- 对金额口径（incl/excl/none）必须显眼
- 删除必须二次确认（或提供撤销）
- 汇总页必须有“辅助计算提示”，避免用户误以为税务保证

## 8. Self-improving 机制（必做）
当你发现以下情况之一：
- 需求误解、重复犯错、输出格式不稳定、代码风格漂移
你必须在仓库新增或更新：
- docs/agent_feedback.md（记录：问题现象→根因→新规则→例子）
并把“新规则”同步补充到本 agent.md 对应章节。

## 9. Agent 启动检查清单（每次开始任务先做）
- 读 prd.md 与 agent.md
- 扫一眼目录结构：pages/app、lib、components、supabaseClient 等
- 找现有的数据表/类型定义（如有）
- 明确本次任务属于 PRD 的 Must-have 还是 Nice-to-have
