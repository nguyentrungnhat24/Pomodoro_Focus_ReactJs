import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Dialog } from '@capacitor/dialog';

// Check if notifications are permitted
export const checkNotificationPermission = async (): Promise<boolean> => {
  const { display } = await LocalNotifications.checkPermissions();
  return display === 'granted';
};

// Request notification permissions
export const requestNotificationPermission = async (): Promise<boolean> => {
  const { display } = await LocalNotifications.requestPermissions();
  return display === 'granted';
};

// Show a dialog to the user
export const showDialog = async (title: string, message: string): Promise<void> => {
  await Dialog.alert({
    title,
    message,
  });
};

// Vibrate the device with a pattern suitable for notifications
export const vibrateDevice = async (pattern: 'notification' | 'success' | 'warning' = 'notification'): Promise<void> => {
  switch (pattern) {
    case 'success':
      await Haptics.impact({ style: ImpactStyle.Medium });
      break;
      
    case 'warning':
      await Haptics.impact({ style: ImpactStyle.Heavy });
      setTimeout(async () => await Haptics.impact({ style: ImpactStyle.Heavy }), 300);
      break;
      
    case 'notification':
    default:
      await Haptics.impact({ style: ImpactStyle.Light });
      setTimeout(async () => await Haptics.impact({ style: ImpactStyle.Light }), 200);
      setTimeout(async () => await Haptics.impact({ style: ImpactStyle.Medium }), 400);
  }
};

// Schedule a local notification
export const scheduleNotification = async (
  title: string, 
  body: string,
  id = Math.floor(Math.random() * 100000),
  sound = 'beep.wav'
): Promise<void> => {
  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title,
        body,
        sound,
        schedule: { at: new Date(Date.now()) },
      },
    ],
  });
};

// Format time for display (adds leading zeros)
export const formatTime = (minutes: number, seconds: number): string => {
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Store session data in localStorage
export const saveSessionToStorage = (sessions: any[]): void => {
  try {
    localStorage.setItem('pomodoroSessions', JSON.stringify(sessions));
  } catch (error) {
    console.error('Error saving sessions to localStorage:', error);
  }
};

// Load session data from localStorage
export const loadSessionsFromStorage = (): any[] => {
  try {
    const sessions = localStorage.getItem('pomodoroSessions');
    if (sessions) {
      // Parse and convert stored date strings back to Date objects
      return JSON.parse(sessions).map((session: any) => ({
        ...session,
        timestamp: new Date(session.timestamp)
      }));
    }
  } catch (error) {
    console.error('Error loading sessions from localStorage:', error);
  }
  return [];
};