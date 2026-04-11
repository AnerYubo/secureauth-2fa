# SecureAuth 2FA

<div align="center">
  <img width="1200" height="475" alt="SecureAuth 2FA Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

<p align="center">
  <strong>安全的客户端双因素认证 (TOTP) 管理器</strong>
</p>

<p align="center">
  <a href="https://github.com/AnerYubo/secureauth-2fa/stargazers">
    <img src="https://img.shields.io/github/stars/AnerYubo/secureauth-2fa?style=flat" alt="Stars">
  </a>
  <a href="https://github.com/AnerYubo/secureauth-2fa/releases">
    <img src="https://img.shields.io/github/v/release/AnerYubo/secureauth-2fa?include_prereleases&style=flat" alt="Releases">
  </a>
  <a href="https://github.com/AnerYubo/secureauth-2fa/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/AnerYubo/secureauth-2fa?style=flat" alt="License">
  </a>
</p>

---

## 🌐 在线演示

**在线访问**: https://silent-paper-03d8.lishaojie0207.workers.dev/

可直接在浏览器中使用，无需本地部署。

---

## ✨ 功能特点

### 🔐 安全优先
- **100% 客户端运行**: 所有数据均在浏览器中处理
- **本地与会话存储**: 可选择存储位置
- **文件系统存储**: 使用 File System Access API 加密本地文件
- **无服务器**: 零知识 - 您的密钥永远不会离开设备

### 📱 TOTP 支持
- 标准 TOTP（基于时间的一次性密码）
- 可配置周期（默认：30秒）
- 支持 6 位和 8 位验证码
- SHA1、SHA256、SHA512 算法

### 📷 二维码集成
- **扫描二维码**: 通过摄像头扫描添加账号
- **图片导入**: 从截图加载二维码
- **手动输入**: 通过密钥手动添加账号

### 🖼️ 自定义
- **自定义图标**: 为每个账号分配图标
- **默认图标库**: 热门服务预置图标
- **深色/浅色主题**: 跟随系统主题

### 📦 批量操作
- **导出全部**: 备份所有账号到加密文件
- **批量导入**: 一次性添加多个账号
- **连续扫描**: 连续扫描多个二维码

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装

```bash
# 克隆仓库
git clone https://github.com/AnerYubo/secureauth-2fa.git
cd secureauth-2fa

# 安装依赖
npm install
```

### 配置

在项目根目录创建 `.env.local` 文件：

```bash
# 可选：设置 Gemini API 密钥用于 AI 功能
GEMINI_API_KEY=your_gemini_api_key_here
```

### 运行开发服务器

```bash
npm run dev
```

在浏览器中打开 [http://localhost:5173](http://localhost:5173)。

### 构建生产版本

```bash
npm run build
```

构建后的文件位于 `dist` 文件夹。

---

## 📖 使用指南

### 添加账号

1. 点击 **+** 按钮
2. 选择方式：
   - **扫描二维码**: 使用摄像头扫描二维码
   - **手动输入**: 输入账号名称和密钥
3. 可选择添加自定义图标
4. 点击 **保存**

### 查看 TOTP 验证码

- 所有账号显示当前 6 位验证码
- 验证码每 30 秒自动刷新
- 点击验证码即可复制到剪贴板

### 导入/导出

1. 进入 **设置**（齿轮图标）
2. 选择 **导出数据** 或 **导入数据**
3. 导出时：选择存储类型并设置密码
4. 导入时：选择备份文件并输入密码

### 存储模式

| 模式 | 说明 |
|------|------|
| **本地** | 数据保存在浏览器 localStorage 中 |
| **会话** | 关闭标签页时清除数据 |
| **文件** | 数据保存在加密的本地文件中（使用 File System Access API） |

---

## 🛠️ 技术栈

- **框架**: React 19 + TypeScript
- **构建工具**: Vite
- **图标**: Lucide React
- **TOTP**: otpauth
- **二维码**: qrcode.react + jsqr
- **加密**: Web Crypto API

---

## 📁 项目结构

```
secureauth-2fa/
├── components/           # React 组件
│   ├── AccountCard.tsx   # 账号卡片
│   ├── LockScreen.tsx   # 应用锁屏
│   ├── LogoSelect.tsx   # 图标选择器
│   ├── Modals.tsx       # 所有弹窗对话框
│   ├── QRCodeScanner.tsx # 摄像头二维码扫描
│   └── Toast.tsx        # 提示通知
├── lib/
│   └── google-auth/      # Google Authenticator 兼容性
├── service/
│   └── FileSystemClient.ts # File System Access API 封装
├── utils/
│   ├── crypto.ts        # 加密工具
│   ├── db.ts            # 数据库/存储助手
│   ├── defaultLogos.ts  # 默认图标库
│   ├── i18n.ts          # 国际化
│   └── qrHelper.ts      # 二维码助手
├── App.tsx              # 主应用
├── index.tsx            # 入口文件
├── types.ts             # TypeScript 类型
└── vite.config.ts       # Vite 配置
```

---

## 🔒 安全说明

- 所有 TOTP 生成均在浏览器本地完成
- 密钥不会发送到任何服务器
- 使用文件系统存储时，文件使用 AES-GCM 加密
- 应用使用 Web Crypto API 进行加密操作

### 最佳实践

1. **启用应用锁**: 设置密码锁定应用
2. **定期备份**: 定期导出数据
3. **安全存储**: 对敏感数据使用文件系统存储
4. **清除会话**: 永久账号不要使用会话存储

---

## 🤝 贡献

欢迎提交 Pull Request！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

---

## 📄 许可证

本项目基于 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解更多。

---

## 🙏 致谢

- [otpauth](https://github.com/hectorm/otpauth) - TOTP 实现
- [qrcode.react](https://github.com/nicklasfrazer/qrcode.react) - 二维码渲染
- [Lucide](https://lucide.dev) - 精美图标

---

## 📷 截图

<p align="center">
  <img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" alt="App Screenshot" />
</p>
