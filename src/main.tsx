import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LocalNotifications } from '@capacitor/local-notifications'
import { registerServiceWorker } from './utils/serviceWorkerRegistration'

// Register Capacitor plugins and Service Worker
const setupApp = async () => {
  // Đăng ký Service Worker để ứng dụng chạy dưới nền
  await registerServiceWorker();
  
  // Request permissions as early as possible
  await LocalNotifications.requestPermissions();
  
  // Add a listener for when notifications are received in foreground
  LocalNotifications.addListener('localNotificationReceived', (notification) => {
    console.log('Notification received in foreground:', notification);
  });
  
  // Add a listener for when a notification is tapped on
  LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
    console.log('Notification action performed:', notificationAction);
  });
};

// Setup app when it starts
setupApp().catch((err: Error) => console.error('Error setting up app:', err));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
