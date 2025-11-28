This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


MVP scope – 2025-11-26

支持从银行 CSV 导入流水（ASB 导出格式），在导入前可预览与勾选要导入的行。

导入时使用「日期 + 金额 + 文本」生成去重 key，可自动跳过已存在的重复流水，并在导入完成后提示「新增 X 条，跳过 Y 条重复」。

交易分类系统整理完成：

合并 Internet / Mobile 为 Internet & mobile phone

Project cost 更名为 Material cost

新增 Financial loan、Owner's funding、Pay to IRD、Refund from IRD 等分类

GST 默认逻辑：

除 Financial loan、Owner's funding、和 IRD 相关分类（Pay / Refund）默认 No GST 之外，其余分类默认 GST included = Yes。

Dashboard 的 GST 计算区域基于 gst_included 字段汇总，Total spending / Total sales 与报表保持一致。

日期范围逻辑修复：

“This month” 会正确覆盖整个自然月（1 号到当月最后一天），不再漏掉 1 号的交易。

Transactions 页面：

支持按日期范围、分类、GST 状态与搜索过滤。

显示每条记录的 GST 是否包含以及可抵扣金额。

导入体验：

导入成功后自动跳转到 /transactions?imported=X&skipped=Y，顶部横幅清晰显示：

Bank statement import finished: X transactions added, Y duplicates skipped.

或 no new transactions, Y duplicates skipped.