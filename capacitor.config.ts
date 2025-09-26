import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.pomodoro.focus',
  appName: 'PomodoroFocus',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_notifications",
      iconColor: "#3F51B5",
      sound: "beep.wav"
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#f5f5f5",
      showSpinner: true,
      spinnerColor: "#3F51B5"
    },
    BackgroundTask: {
      allowExecutionInForeground: true
    }
  },
  server: {
    androidScheme: "https"
  }
};

export default config;
