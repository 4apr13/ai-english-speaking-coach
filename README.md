# ai-english-speaking-coach
An AI-powered English speaking practice tool with real-time conversation, grammar correction, pronunciation feedback and learning reports.
# 🎙️ AI 英语口语陪练

> 灵算小队 · AI 驱动的英语口语练习工具

---

## 📖 项目简介

AI 英语口语陪练是一款基于大语言模型的英语口语练习工具，帮助用户在真实场景下进行沉浸式英语对话训练。用户只需打开浏览器，选择场景，开口说话，即可与 AI 角色展开自然对话，并在结束后获得量化的学习报告。

本项目无需安装、无需注册，纯前端实现，打开即用。

---

## ✨ 核心功能

### 🎭 五大真实场景
| 场景 | 描述 | AI 角色 |
|------|------|---------|
| 💼 面试 | 模拟求职英语面试 | 科技公司 HR |
| 🍔 点餐 | 西餐厅英语点餐 | 餐厅服务员 |
| 📊 会议 | 职场项目会议沟通 | 团队负责人 |
| ✈️ 旅行 | 酒店入住出行英语 | 酒店前台 |
| 💬 日常对话 | 与母语者自然闲聊 | 友好的外国朋友 |

### 🎤 真实语音交互
- 浏览器原生 Web Speech API 实现实时语音识别
- 点击开始录音，停顿不会打断，主动点击才提交
- AI 说话时可随时打断，立即接管对话
- 等待 AI 回复期间按钮自动锁定，防止误操作

### 🤖 真实 AI 对话
- 接入 DeepSeek Chat API，基于完整对话历史生成回复
- 每个场景有 4 种随机开场白，每次对话体验不同
- AI 在对话中自然纠正语法错误，不打断对话节奏

### 📊 量化课后总结
- **对话概览**：轮数、时长、总词数
- **发音评分**：五星制，基于语音识别结果分析发音准确度
- **语法纠错**：每条错误独立展示，含错误表达、正确表达、原因说明
- **表达亮点**：AI 提炼本次使用的地道表达
- **下次建议**：针对本次对话的个性化练习建议

---

## 🚀 快速开始

### 环境要求
- Chrome 浏览器（语音识别仅支持 Chrome）
- 需要麦克风权限
- 需要网络连接（调用 AI API）

### 本地运行
1. 克隆仓库
```bash
git clone https://github.com/4apr13/ai-english-speaking-coach.git
cd ai-english-speaking-coach
```

2. 创建 `config.js` 文件（不提交到 Git）
```javascript
const CONFIG = {
    DEEPSEEK_API_KEY: '你的 DeepSeek API Key',
    API_URL: 'https://api.deepseek.com/v1/chat/completions',
    MODEL: 'deepseek-chat'
};
```

3. 用 VS Code Live Server 或任意本地服务器打开 `index.html`

> ⚠️ 注意：`config.js` 已加入 `.gitignore`，API Key 不会被提交到仓库

---

## 📁 项目结构
| 文件 | 内容 |
|----|---------|
| index.html | 页面结构 | 
| style.css | 样式（温暖简约风格）|
| script.js | 核心逻辑（语音识别、AI对话、课后总结）|
| prompts.js | 各场景AI提示词 |
| config.js  | API 配置（本地，不提交）|
| readme.md | 项目说明 |

## 🔄 迭代记录

本项目共经历 **8 次迭代**，完整记录产品从 MVP 到可用版本的演进过程：

| PR | 迭代内容 | 
|----|---------|
| MVP | 完成基础页面框架，包含场景选择、录音控制、模拟对话 |
| PR #1 | 移除误导性随机评分，保护用户信任 |
| PR #2 | 移除 prompt 输入框，接入 Web Speech API |
| PR #3 | 修复语音识别中断问题，优化语法检查准确性 | 
| PR #4 | 接入 DeepSeek API，实现真实 AI 对话 | 
| PR #5 | 优化录音交互，支持打断AI、手动停止、等待期锁定 | 
| PR #6 | 重构课后总结，新增量化评分和结构化语法纠错 | 
| PR #7 | 新增旅行、日常对话场景，全面优化提示词质量 | 
| PR #8 | 全面重设计 UI，温暖简约风格 + 精致动效升级 | 

---

## 👥 团队分工

**灵算小队**

| 成员 | 角色 | 主要贡献 |
|------|------|---------|
| 刘阳 | 产品负责人 | MVP 问题排查与修复（PR #1-3）、场景扩展与提示词优化（PR #7）、UI 全面重设计（PR #8）、README 撰写 |
| 周雨涵 | 技术负责人 | DeepSeek API 接入（PR #4）、录音交互体验优化（PR #5）、Demo 视频录制 |

---

## 🛠️ 技术栈

- **前端**：原生 HTML / CSS / JavaScript，无框架依赖
- **语音识别**：Web Speech API（浏览器原生）
- **语音合成**：Web Speech Synthesis API（浏览器原生）
- **AI 对话**：DeepSeek Chat API
- **字体**：Google Fonts - Nunito

---

## 📌 已知限制与后续规划

**当前限制**
- 语音识别仅支持 Chrome 浏览器
- 需要用户自行配置 API Key
- 发音评分基于文字识别结果推断，非专业音素级评测

**后续规划**
- 接入专业发音评测 API（Azure Pronunciation Assessment）
- 添加历史记录功能，支持不同时间段进度对比
- 支持自定义场景输入
- 移动端适配优化

**demo视频链接**
-  https://www.bilibili.com/video/BV16EEh6KEWi?buvid=XU089AF07A931EEC983ABEE583293E0B7C8F9&from_spmid=default-value&is_story_h5=false&mid=sai6uPvnHwb4Jv8IM3lHYX8FTQ%2FSZMtL1rElX6M3iMo%3D&plat_id=116&share_from=ugc&share_medium=android&share_plat=android&share_session_id=b76fcc2f-0ced-45a0-a399-0c8d1be2f846&share_source=WEIXIN&share_tag=s_i&spmid=united.player-video-detail.0.0&timestamp=1780846081&unique_k=iKNDTlA&up_id=3494361566284174&vd_source=5499657daedd9af035ae6a6776d86b02
