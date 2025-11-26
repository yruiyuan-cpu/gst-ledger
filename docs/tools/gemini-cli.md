# Gemini CLI 使用说明 / Gemini CLI Guide

> 版本：v0.x（以实际安装为准）  
> 适用环境：Mac / Linux / Windows 终端 + Node.js 20+

---

## 1. 它是干嘛的？What is Gemini CLI

Gemini CLI 是 Google 官方的 **开源 AI Agent**，把 Gemini 模型直接带到终端里使用。  
简单理解：它是一个可以“看代码 + 改代码 + 跑命令”的 AI 助手，比普通聊天版的 AI 更适合搞项目。

主要特点（对本项目的意义）：

- ✅ **看整个项目**：可以读取代码、配置、文档，理解项目结构  
- ✅ **直接动手改**：生成代码、修改文件、创建新文件（例如本说明书）  
- ✅ **跑命令**：如 `npm run dev`、`npm test`、`git diff` 等  
- ✅ **支持工具 & MCP**：可以调用搜索、文件操作、终端工具等  
- ✅ **免费额度**：个人 Google 帐号可以免费用一部分（具体额度以官方为准）

---

## 2. 安装与运行（以 Mac 为例）

> 前置要求：  
> - Node.js 20+（推荐用 `node -v` 检查）  
> - 已经安装 npm（随 Node 一起带有）

### 2.1 全局安装（推荐）

在终端里运行：

```bash
npm install -g @google/gemini-cli
