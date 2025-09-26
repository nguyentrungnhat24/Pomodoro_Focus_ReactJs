import { useEffect } from 'react'
import './App.css'
import PomodoroTimer from './components/PomodoroTimer'
import './components/PomodoroTimer.css'
import { requestNotificationPermission, showDialog } from './utils/capacitorUtils'

function App() {
  useEffect(() => {
    // Request notification permissions when the app starts
    const setupPermissions = async () => {
      const granted = await requestNotificationPermission();
      if (!granted) {
        await showDialog(
          'Notification Permission', 
          'Please enable notifications to receive timer alerts when your sessions end.'
        );
      }
    };

    setupPermissions();
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Pomodoro Focus</h1>
        <p>Stay productive with timed work and break sessions</p>
      </header>
      
      <main>
        <PomodoroTimer />
      </main>
      
      <footer className="app-footer">
        <p>Pomodoro Focus - Stay focused and take breaks regularly</p>
      </footer>
    </div>
  )
}

export default App
