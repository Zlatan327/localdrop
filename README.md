# LocalDrop 🚀

LocalDrop is a lightning-fast, **zero-dependency** native Node.js application that lets you seamlessly transfer videos, documents, and images from your smartphone directly to your PC over your local Wi-Fi network. No USB cables, no cloud services, and it works 100% offline!

## Features
- ⚡ **Zero Dependencies**: Built entirely using native Node.js (`http`, `fs`, `os`) and raw HTML/JS. No bloated `node_modules` required!
- 📴 **100% Offline**: It only requires a local Wi-Fi connection. Even the QR code generation happens locally in your browser.
- 🔒 **Privacy First**: Files are streamed directly from your device to your computer's hard drive. The mobile interface is upload-only, ensuring no one else on the network can view your files.
- 🎨 **Beautiful UI**: Modern, dark-mode styling utilizing sleek CSS variables.

## How to Install & Run

1. **Prerequisite**: Ensure you have [Node.js](https://nodejs.org/) installed on your computer.
2. Clone or download this repository.
3. Open a terminal in the folder and run:
   ```bash
   node server.js
   ```
4. Or, on Windows, simply double-click the `Start-LocalDrop.bat` file!

## How to Use
1. Once the server is running, your PC will automatically open the dashboard at `http://localhost:3000`.
2. Grab your smartphone and ensure it is connected to the same Wi-Fi network as your PC.
3. Open your phone's camera and scan the **QR Code** displayed on your PC screen.
4. Tap the upload zone, pick your files, and hit "Send"!

## Technical Details
This application bypasses standard heavy package managers and uses a direct octet-stream upload pipeline to parse multipart data instantly. This allows it to handle huge video files easily without crushing your RAM or relying on external packages like `formidable` or `multer`.

---
*Built to make local file sharing frictionless.*
