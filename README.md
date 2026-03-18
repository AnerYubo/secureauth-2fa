# SecureAuth 2FA

<div align="center">
  <img width="1200" height="475" alt="SecureAuth 2FA Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

<p align="center">
  <strong>A secure, client-side Two-Factor Authentication (TOTP) manager</strong>
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

## ✨ Features

### 🔐 Security-First Design
- **100% Client-Side**: All data stays in your browser
- **Local & Session Storage**: Choose where to store your 2FA secrets
- **File System Storage**: Use File System Access API for encrypted local files
- **No Server**: Zero knowledge - your secrets never leave your device

### 📱 TOTP Support
- Standard TOTP (Time-based One-Time Password)
- Configurable period (default: 30 seconds)
- Support for 6 and 8 digit codes
- SHA1, SHA256, SHA512 algorithms

### 📷 QR Code Integration
- **Scan QR Codes**: Add accounts by scanning with your camera
- **Import from Image**: Load QR codes from screenshots
- **Manual Entry**: Add accounts manually with secret keys

### 🖼️ Customization
- **Custom Logos**: Assign icons to each account
- **Default Logo Library**: Pre-built logos for popular services
- **Dark/Light Theme**: System-aware theme switching

### 📦 Batch Operations
- **Export All**: Backup all accounts to encrypted file
- **Import Multiple**: Add multiple accounts at once
- **QR Code Batch Scan**: Scan multiple QR codes in succession

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/AnerYubo/secureauth-2fa.git
cd secureauth-2fa

# Install dependencies
npm install
```

### Configuration

Create a `.env.local` file in the project root:

```bash
# Optional: Set your Gemini API key for AI features
GEMINI_API_KEY=your_gemini_api_key_here
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

---

## 📖 Usage Guide

### Adding an Account

1. Click the **+** button
2. Choose a method:
   - **Scan QR Code**: Use your camera to scan a QR code
   - **Enter Manually**: Type the account name and secret key
3. Optionally add a custom logo
4. Click **Save**

### Viewing TOTP Codes

- All accounts display their current 6-digit codes
- Codes automatically refresh every 30 seconds
- Click on a code to copy it to clipboard

### Exporting/Importing

1. Go to **Settings** (gear icon)
2. Choose **Export Data** or **Import Data**
3. For export: choose storage type and set a password
4. For import: select your backup file and enter password

### Storage Modes

| Mode | Description |
|------|-------------|
| **Local** | Data persists in browser localStorage |
| **Session** | Data cleared when tab closes |
| **File** | Data stored in encrypted local file (File System Access API) |

---

## 🛠️ Technology Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Icons**: Lucide React
- **TOTP**: otpauth
- **QR Code**: qrcode.react + jsqr
- **Encryption**: Web Crypto API

---

## 📁 Project Structure

```
secureauth-2fa/
├── components/           # React components
│   ├── AccountCard.tsx   # Account display card
│   ├── LockScreen.tsx   # App lock screen
│   ├── LogoSelect.tsx   # Logo picker
│   ├── Modals.tsx       # All modal dialogs
│   ├── QRCodeScanner.tsx # Camera QR scanner
│   └── Toast.tsx        # Toast notifications
├── lib/
│   └── google-auth/      # Google Authenticator compatibility
├── service/
│   └── FileSystemClient.ts # File System Access API wrapper
├── utils/
│   ├── crypto.ts        # Encryption utilities
│   ├── db.ts            # Database/storage helpers
│   ├── defaultLogos.ts  # Default logo library
│   ├── i18n.ts          # Internationalization
│   └── qrHelper.ts      # QR code helpers
├── App.tsx              # Main application
├── index.tsx            # Entry point
├── types.ts             # TypeScript types
└── vite.config.ts       # Vite configuration
```

---

## 🔒 Security Notes

- All TOTP generation happens locally in your browser
- Secrets are never sent to any server
- When using File System storage, files are encrypted with AES-GCM
- The app uses Web Crypto API for cryptographic operations

### Best Practices

1. **Enable App Lock**: Set a password to lock the app
2. **Regular Backups**: Export your data regularly
3. **Secure Storage**: Use File System storage for sensitive data
4. **Clear Session**: Don't use Session storage for permanent accounts

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [otpauth](https://github.com/hectorm/otpauth) - TOTP implementation
- [qrcode.react](https://github.com/nicklasfrazer/qrcode.react) - QR code rendering
- [Lucide](https://lucide.dev) - Beautiful icons

---

## 📷 Screenshots

<p align="center">
  <img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" alt="App Screenshot" />
</p>
