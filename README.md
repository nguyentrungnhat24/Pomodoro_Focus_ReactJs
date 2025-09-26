# PomodoroFocus

A modern Pomodoro timer application built with React, TypeScript, and Capacitor for cross-platform functionality.

## Features

- ⏱️ Customizable Pomodoro timer with work and break sessions
- 🔔 Multiple notification methods including audio, visual flash effects, and system notifications
- 📱 Works on web and mobile platforms (Android support)
- 📊 Session history tracking to monitor your productivity
- 🎨 Clean, intuitive user interface
- 🌙 Dark mode support
- 💾 Local storage for saving preferences and history

## Technologies Used

- React & TypeScript
- Vite for fast development and building
- Capacitor for cross-platform native runtime
- Web Audio API for sound generation
- Service Worker for background timer functionality

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/nguyentrungnhat24/PomodoroFocus.git
cd PomodoroFocus
```

2. Install dependencies
```bash
npm install
# or
yarn
```

3. Start the development server
```bash
npm run dev
# or
yarn dev
```

4. Build for production
```bash
npm run build
# or
yarn build
```

### Mobile Development

This project uses Capacitor to enable mobile app development:

```bash
# Initialize Capacitor (already done)
npx cap init PomodoroFocus io.pomodoro.focus --web-dir=dist

# Add Android platform
npx cap add android

# Build the web app and copy to native platforms
npm run build
npx cap copy

# Open Android project in Android Studio
npx cap open android
```

## Usage

1. Set your preferred work duration (default: 25 minutes)
2. Set your preferred break duration (default: 5 minutes)
3. Select notification sounds
4. Start the timer and focus on your task
5. When the timer ends, take a break
6. Review your session history to track your productivity

## Features in Detail

### Timer Controls

- Start/Pause/Reset buttons
- Customizable work and break durations
- Visual progress indicator

### Notification System

- Audio alerts with multiple sound options
- Visual flash effect for non-audio environments
- System notifications when app is in background (mobile)
- Haptic feedback on mobile devices

### Session History

- Track completed work and break sessions
- View statistics on your focus time
- Clear history when needed

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.
