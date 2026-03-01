We are not in any way affiliated with home assistant, this is a completly seperate project from theirs.
# Home Assistant Desktop

A clean, frameless desktop client for [Home Assistant](https://www.home-assistant.io/) — supports Windows and Linux.

# Features

- 🏠 First-run setup wizard to enter your HA server address
- 🔐 Persistent login — saves cookies, localStorage, and session data
- 🪟 Frameless window with custom titlebar (no ugly OS toolbar)
- ↩️ Back & Reload navigation buttons
- ⚙️ Settings menu to change server / reset session
- 🖥️ Builds to `.exe` (Windows) and `.AppImage`/`.deb` (Linux)

---

# Getting Started

## For normal users:
#### Download the app via releases for Windows and Linux

## For Developers:

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or newer
- npm (comes with Node.js)

### Install & Run

```bash
# Install dependencies
npm install

# Run in development mode
npm start
```

### First Launch

On first startup, you'll see a setup screen. Enter your Home Assistant server address:

- `homeassistant.local:8123` ← local mDNS
- `192.168.1.10:8123` ← local IP
- `https://my.homeassistant.domain.com` ← remote/Nabu Casa

---

## Building Installers

### Windows (.exe installer)

```bash
npm run build:win
```

Outputs to `dist/` — creates an NSIS installer.

### Linux (.AppImage + .deb)

```bash
npm run build:linux
```

### Both at once

```bash
npm run build
```

---
## Changing Server

Click the **⚙️** settings icon in the top-right, then **Change Server**. This clears your saved session and returns to the setup screen.
