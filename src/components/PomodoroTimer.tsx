import { useState, useEffect, useRef } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Dialog } from '@capacitor/dialog';
import { registerServiceWorker, sendTimerDataToServiceWorker } from '../utils/serviceWorkerRegistration';
import { playSound } from '../utils/audioUtils';
import SoundPicker from './SoundPicker';
import './SoundPicker.css';
import FlashEffect from './FlashEffect';

// Types
interface TimerState {
  minutes: number;
  seconds: number;
  isRunning: boolean;
  mode: 'work' | 'break';
  completedPomodoros: number;
}

interface SessionRecord {
  timestamp: Date;
  duration: number;
  type: 'work' | 'break';
}

const PomodoroTimer = () => {
  // Constants for timer durations
  const WORK_MINUTES = 25;
  const BREAK_MINUTES = 5;
  
  // State management
  const [timer, setTimer] = useState<TimerState>({
    minutes: WORK_MINUTES,
    seconds: 0,
    isRunning: false,
    mode: 'work',
    completedPomodoros: 0,
  });
  
  const [sessionHistory, setSessionHistory] = useState<SessionRecord[]>([]);
  const [selectedSound, setSelectedSound] = useState<string>('beep'); // Âm thanh mặc định
  const [flashTrigger, setFlashTrigger] = useState<number>(0); // Đếm số lần kích hoạt flash
  const intervalRef = useRef<number | null>(null);
  
  // Sử dụng ref để theo dõi phiên hiện tại, tránh ghi nhật ký hai lần
  const currentSessionRef = useRef<{
    id: string;
    recorded: boolean;
  }>({ id: 'initial', recorded: false });
  
  // Kiểm tra xem thiết bị hiện tại có phải là thiết bị di động hay không
  const isMobileDevice = useRef<boolean>(false);
  
  useEffect(() => {
    // Kiểm tra thiết bị di động đơn giản
    const checkMobileDevice = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };
    
    isMobileDevice.current = checkMobileDevice();
  }, []);
  
  // Khởi tạo Service Worker và theo dõi sự kiện timer hoàn thành
  useEffect(() => {
    // Đăng ký Service Worker
    registerServiceWorker().then(registered => {
      console.log('Service Worker registered:', registered);
    });

    // Đăng ký xử lý sự kiện khi timer hoàn thành (được gửi từ Service Worker)
    const handleTimerCompleted = (event: any) => {
      const { nextMode } = event.detail;
      console.log('Timer completed event received from Service Worker:', nextMode);
      
      // QUAN TRỌNG: Phát âm thanh ngay lập tức khi nhận sự kiện từ Service Worker
      console.log('Playing sound immediately with Web Audio API');
      playSound(selectedSound); // Phương pháp 3 - Web Audio API - Đảm bảo luôn có âm thanh
      
      // Chuyển đổi giữa chế độ work và break
      const newMinutes = nextMode === 'work' ? WORK_MINUTES : BREAK_MINUTES;
      
      // Tăng số pomodoro đã hoàn thành nếu chuyển từ break sang work
      const newCompletedPomodoros = 
        (timer.mode === 'break' && nextMode === 'work') 
          ? timer.completedPomodoros 
          : timer.completedPomodoros + 1;
      
      // Cập nhật state
      setTimer({
        minutes: newMinutes,
        seconds: 0,
        isRunning: false,
        mode: nextMode as 'work' | 'break',
        completedPomodoros: newCompletedPomodoros
      });
      
      // Ghi lại lịch sử phiên - với ID duy nhất để tránh ghi đúp
      const sessionId = `${timer.mode}-${Date.now()}`;
      
      // Kiểm tra xem phiên này đã được ghi chưa
      if (!currentSessionRef.current.recorded || currentSessionRef.current.id !== sessionId) {
        currentSessionRef.current = { id: sessionId, recorded: true };
        console.log('Recording session history from Service Worker event:', sessionId);
        
        setSessionHistory(prev => [
          ...prev,
          {
            timestamp: new Date(),
            duration: timer.mode === 'work' ? WORK_MINUTES : BREAK_MINUTES,
            type: timer.mode
          }
        ]);
      }
      
      // Sử dụng setTimeout để đảm bảo thứ tự thực hiện
      setTimeout(() => {
        // Thông báo và rung sau khi đã phát âm thanh
        showNotification(timer.mode);
        vibrateDevice();
      }, 100);
    };
    
    // Đăng ký lắng nghe sự kiện timerCompleted
    window.addEventListener('timerCompleted', handleTimerCompleted);
    
    // Yêu cầu quyền thông báo
    const requestPermissions = async () => {
      const { display } = await LocalNotifications.requestPermissions();
      if (display !== 'granted') {
        await Dialog.alert({
          title: 'Permission Required',
          message: 'Please enable notifications to receive timer alerts.'
        });
      }
    };
    
    requestPermissions();
    
    // Dọn dẹp khi component unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.removeEventListener('timerCompleted', handleTimerCompleted);
    };
  }, []);
  
  // Timer logic - đồng bộ với Service Worker
  useEffect(() => {
    if (timer.isRunning) {
      // Gửi dữ liệu timer đến Service Worker để chạy nền
      const durationMs = timer.minutes * 60 * 1000 + timer.seconds * 1000;
      sendTimerDataToServiceWorker({
        type: 'START_TIMER',
        mode: timer.mode,
        duration: durationMs
      });
      
      // Đồng thời cũng chạy timer trong UI
      intervalRef.current = setInterval(() => {
        setTimer((prevTimer) => {
          // If timer reached 0
          if (prevTimer.minutes === 0 && prevTimer.seconds === 0) {
            // Stop the interval
            if (intervalRef.current) clearInterval(intervalRef.current);
            
            const completedMode = prevTimer.mode;
            const duration = completedMode === 'work' ? WORK_MINUTES : BREAK_MINUTES;
            
            // Record the completed session - với ID duy nhất để tránh ghi đúp
            const sessionId = `${completedMode}-${Date.now()}`;
            
            // Kiểm tra xem phiên này đã được ghi chưa
            if (currentSessionRef.current.id !== sessionId) {
              currentSessionRef.current = { id: sessionId, recorded: true };
              console.log('Recording session history from UI timer:', sessionId);
              
              setSessionHistory(prev => [
                ...prev, 
                {
                  timestamp: new Date(),
                  duration,
                  type: completedMode
                }
              ]);
            }
            
            // Switch modes and notify
            const newMode = completedMode === 'work' ? 'break' : 'work';
            const newMinutes = newMode === 'work' ? WORK_MINUTES : BREAK_MINUTES;
            
            // QUAN TRỌNG: Phát âm thanh trước tiên - phát trực tiếp với Web Audio API
            console.log('Timer reached zero! Playing sound immediately with Web Audio API');
            playSound(selectedSound); // Phương pháp 3 - Web Audio API
            
            // Sau đó thực hiện thông báo và rung
            setTimeout(() => {
              console.log('Showing notification and vibrating device');
              showNotification(completedMode);
              vibrateDevice();
            }, 100);
            
            return {
              minutes: newMinutes,
              seconds: 0,
              isRunning: false,
              mode: newMode,
              completedPomodoros: completedMode === 'work' 
                ? prevTimer.completedPomodoros + 1 
                : prevTimer.completedPomodoros
            };
          }
          
          // Normal countdown
          if (prevTimer.seconds === 0) {
            return {
              ...prevTimer,
              minutes: prevTimer.minutes - 1,
              seconds: 59
            };
          } else {
            return {
              ...prevTimer,
              seconds: prevTimer.seconds - 1
            };
          }
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timer.isRunning]);
  
  // Show notification based on mode
  const showNotification = async (completedMode: 'work' | 'break') => {
    // Trực tiếp sử dụng Web Audio API (phương án 3) để đảm bảo luôn có âm thanh
    console.log(`Timer completed: ${completedMode} mode. Playing sound: ${selectedSound}`);
    
    // Phát âm thanh với Web Audio API - đảm bảo luôn phát được
    playSound(selectedSound);
    
    // Vẫn thử phát âm thanh thông báo thông thường (dùng cả phương pháp khác)
    setTimeout(() => {
      playNotificationSound();
    }, 100);
    
    // Hiển thị thông báo hệ thống
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: Math.floor(Math.random() * 100000),
          title: completedMode === 'work' ? 'Break Time!' : 'Back to Work!',
          body: completedMode === 'work' 
            ? `Great job! Time for a ${BREAK_MINUTES}-minute break.` 
            : `Break's over! Time for a ${WORK_MINUTES}-minute work session.`,
          sound: `sounds/${selectedSound}.wav`, // Sử dụng âm thanh đã chọn
          schedule: { at: new Date(Date.now()) }
        }]
      });
      console.log('System notification scheduled');
    } catch (error) {
      console.error('Error scheduling notification:', error);
      // Fallback: Hiển thị alert nếu không thể hiện thông báo hệ thống
      if (completedMode === 'work') {
        alert(`Great job! Time for a ${BREAK_MINUTES}-minute break.`);
      } else {
        alert(`Break's over! Time for a ${WORK_MINUTES}-minute work session.`);
      }
    }
  };
  
  // Phát âm thanh thông báo với nhiều phương pháp dự phòng
  const playNotificationSound = () => {
    try {
      console.log(`Attempting to play sound: ${selectedSound}`);
      
      // Biến đếm các lần thử
      let attemptCount = 0;
      
      // Phương pháp 1: Thử với đường dẫn tương đối
      const tryMethod1 = () => {
        console.log('Thử phương pháp 1: Audio constructor với đường dẫn tương đối');
        const audio = new Audio(`./sounds/${selectedSound}.wav`);
        audio.volume = 1.0;
        
        const promise = audio.play();
        if (promise !== undefined) {
          promise
            .then(() => console.log('Phương pháp 1 thành công'))
            .catch(error => {
              console.error('Phương pháp 1 thất bại:', error);
              tryMethod2();
            });
        } else {
          console.log('Audio play không trả về promise, thử phương pháp 2');
          tryMethod2();
        }
      };
      
      // Phương pháp 2: Thử với đường dẫn tuyệt đối
      const tryMethod2 = () => {
        console.log('Thử phương pháp 2: Audio constructor với đường dẫn tuyệt đối');
        attemptCount++;
        
        const audio = new Audio(`${window.location.origin}/sounds/${selectedSound}.wav`);
        audio.volume = 1.0;
        
        const promise = audio.play();
        if (promise !== undefined) {
          promise
            .then(() => console.log('Phương pháp 2 thành công'))
            .catch(error => {
              console.error('Phương pháp 2 thất bại:', error);
              tryMethod3();
            });
        } else {
          console.log('Audio play không trả về promise, thử phương pháp 3');
          tryMethod3();
        }
      };
      
      // Phương pháp 3: Sử dụng HTMLAudioElement với nhiều nguồn
      const tryMethod3 = () => {
        console.log('Thử phương pháp 3: HTMLAudioElement với nhiều nguồn');
        attemptCount++;
        
        const audioElement = document.createElement('audio');
        audioElement.id = 'notification-sound';
        audioElement.volume = 1.0;
        
        // Thêm nhiều nguồn với các đường dẫn khác nhau
        const paths = [
          `./sounds/${selectedSound}.wav`,
          `/sounds/${selectedSound}.wav`,
          `sounds/${selectedSound}.wav`,
          `${window.location.origin}/sounds/${selectedSound}.wav`
        ];
        
        paths.forEach(path => {
          const source = document.createElement('source');
          source.src = path;
          source.type = 'audio/wav';
          audioElement.appendChild(source);
        });
        
        audioElement.onplay = () => console.log('Phương pháp 3 thành công');
        audioElement.onerror = () => {
          console.error('Phương pháp 3 thất bại');
          document.body.removeChild(audioElement);
          tryFallbackMethod();
        };
        
        document.body.appendChild(audioElement);
        
        const promise = audioElement.play();
        if (promise !== undefined) {
          promise
            .then(() => {
              console.log('Phương pháp 3 thành công');
              setTimeout(() => {
                if (audioElement.parentNode) {
                  document.body.removeChild(audioElement);
                }
              }, 5000);
            })
            .catch(error => {
              console.error('Phương pháp 3 thất bại:', error);
              if (audioElement.parentNode) {
                document.body.removeChild(audioElement);
              }
              tryFallbackMethod();
            });
        } else {
          console.log('Audio play không trả về promise, thử phương pháp dự phòng');
          tryFallbackMethod();
        }
      };
      
      // Phương pháp dự phòng: Sử dụng Web Audio API
      const tryFallbackMethod = () => {
        console.log('Sử dụng Web Audio API làm phương pháp dự phòng');
        // Phát âm thanh tương ứng với loại đã chọn
        const success = playSound(selectedSound);
        console.log('Web Audio API:', success ? 'thành công' : 'thất bại');
        
        if (!success) {
          console.error('Tất cả phương pháp đều thất bại');
          alert('Không thể phát âm thanh. Vui lòng kiểm tra cài đặt âm thanh của trình duyệt.');
        }
      };
      
      // Bắt đầu thử với phương pháp 1
      tryMethod1();
    } catch (error) {
      console.error('Lỗi khi thiết lập âm thanh:', error);
      // Nếu có lỗi, vẫn thử phát âm thanh với Web Audio API
      playSound(selectedSound);
    }
  };
  
  // Vibrate device using haptics (cho thiết bị di động) hoặc flash effect (cho desktop)
  const vibrateDevice = async () => {
    console.log('Vibrate device called, isMobile:', isMobileDevice.current);
    
    if (isMobileDevice.current) {
      console.log('Using haptics for mobile device');
      try {
        // Sử dụng haptics trên thiết bị di động
        await Haptics.impact({ style: ImpactStyle.Heavy });
        // For a stronger vibration, trigger multiple impacts
        setTimeout(async () => await Haptics.impact({ style: ImpactStyle.Heavy }), 300);
        setTimeout(async () => await Haptics.impact({ style: ImpactStyle.Medium }), 600);
      } catch (error) {
        console.error('Haptics error:', error);
        // Fallback to flash if haptics fails
        console.log('Falling back to flash effect');
        setFlashTrigger(prev => {
          console.log('Setting flash trigger to:', prev + 1);
          return prev + 1;
        });
      }
    } else {
      // Sử dụng flash effect trên desktop
      console.log('Using flash effect for desktop');
      const currentValue = flashTrigger;
      setFlashTrigger(prev => {
        const newValue = prev + 1;
        console.log('Flash trigger changed from', prev, 'to', newValue);
        return newValue;
      });
      
      // Double-check if state was updated
      setTimeout(() => {
        console.log('Flash trigger after timeout:', flashTrigger, 'Previous:', currentValue);
      }, 100);
    }
  };
  
  // Handler functions for controls - đã tích hợp Service Worker
  const toggleTimer = () => {
    const newIsRunning = !timer.isRunning;
    
    // Cập nhật Service Worker
    if (newIsRunning) {
      // Bắt đầu timer trong Service Worker để chạy nền
      const durationMs = timer.minutes * 60 * 1000 + timer.seconds * 1000;
      sendTimerDataToServiceWorker({
        type: 'START_TIMER',
        mode: timer.mode,
        duration: durationMs
      });
    } else {
      // Tạm dừng timer trong Service Worker
      sendTimerDataToServiceWorker({
        type: 'PAUSE_TIMER'
      });
    }
    
    // Cập nhật trạng thái local
    setTimer(prev => ({
      ...prev,
      isRunning: newIsRunning
    }));
  };
  
  const resetTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Reset timer trong Service Worker
    sendTimerDataToServiceWorker({
      type: 'RESET_TIMER',
      mode: timer.mode,
      duration: (timer.mode === 'work' ? WORK_MINUTES : BREAK_MINUTES) * 60 * 1000
    });
    
    // Reset cờ kiểm soát phiên
    currentSessionRef.current = { id: `reset-${Date.now()}`, recorded: false };
    
    // Reset UI state
    setTimer({
      minutes: timer.mode === 'work' ? WORK_MINUTES : BREAK_MINUTES,
      seconds: 0,
      isRunning: false,
      mode: timer.mode,
      completedPomodoros: timer.completedPomodoros
    });
  };
  
  const switchMode = () => {
    const newMode = timer.mode === 'work' ? 'break' : 'work';
    const newMinutes = newMode === 'work' ? WORK_MINUTES : BREAK_MINUTES;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Cập nhật mode trong Service Worker
    sendTimerDataToServiceWorker({
      type: 'RESET_TIMER',
      mode: newMode,
      duration: newMinutes * 60 * 1000
    });
    
    // Reset cờ kiểm soát phiên
    currentSessionRef.current = { id: `switch-${Date.now()}`, recorded: false };
    
    setTimer({
      minutes: newMinutes,
      seconds: 0,
      isRunning: false,
      mode: newMode,
      completedPomodoros: timer.completedPomodoros
    });
  };
  
  // Format time for display (e.g., 01:05 instead of 1:5)
  const formatTime = (minutes: number, seconds: number) => {
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Hàm đảm bảo phát âm thanh trong mọi tình huống - dùng cho việc debug
  const ensureSound = () => {
    console.log('Ensuring sound playback with all methods');
    
    // Phương pháp 1: Audio constructor
    try {
      const audio1 = new Audio(`${window.location.origin}/sounds/${selectedSound}.wav`);
      audio1.volume = 1.0;
      audio1.play()
        .then(() => console.log('Method 1 successful'))
        .catch(err => console.error('Method 1 failed:', err));
    } catch (e) {
      console.error('Method 1 error:', e);
    }
    
    // Phương pháp 2: HTMLAudioElement
    try {
      const audio2 = document.createElement('audio');
      audio2.src = `./sounds/${selectedSound}.wav`;
      audio2.volume = 1.0;
      document.body.appendChild(audio2);
      audio2.play()
        .then(() => console.log('Method 2 successful'))
        .catch(err => console.error('Method 2 failed:', err));
      setTimeout(() => {
        if (audio2.parentNode) document.body.removeChild(audio2);
      }, 3000);
    } catch (e) {
      console.error('Method 2 error:', e);
    }
    
    // Phương pháp 3: Web Audio API
    try {
      playSound(selectedSound);
      console.log('Method 3 called');
    } catch (e) {
      console.error('Method 3 error:', e);
    }
  };
  
  return (
    <div className="pomodoro-container">
      <div className={`timer-display ${timer.mode}`}>
        <h2>{timer.mode === 'work' ? 'Work Time' : 'Break Time'}</h2>
        <div className="timer">{formatTime(timer.minutes, timer.seconds)}</div>
        <div className="completed-pomodoros">
          Completed Pomodoros: {timer.completedPomodoros}
        </div>
      </div>
      
      <div className="controls">
        <button onClick={toggleTimer} className="control-btn">
          {timer.isRunning ? 'Pause' : 'Start'}
        </button>
        <button onClick={resetTimer} className="control-btn">Reset</button>
        <button onClick={switchMode} className="control-btn">
          Switch to {timer.mode === 'work' ? 'Break' : 'Work'}
        </button>
      </div>
      
      {/* Chọn âm thanh thông báo */}
      <SoundPicker 
        selectedSound={selectedSound} 
        onSoundChange={setSelectedSound} 
      />
      <div className="test-buttons">
        <button 
          onClick={() => {
            console.log("Test button clicked - phương pháp 1");
            // Cách đơn giản nhất để phát âm thanh web - cách 1
            const audio = new Audio(`${window.location.origin}/sounds/${selectedSound}.wav`);
            audio.volume = 1.0;
            audio.play()
              .then(() => console.log("Phương pháp 1: Âm thanh đang phát"))
              .catch(err => console.error("Lỗi phương pháp 1:", err));
            
            vibrateDevice();
          }} 
          className="control-btn test-btn">
          Test Phương Pháp 1
        </button>
        
        <button 
          onClick={() => {
            console.log("Test button clicked - phương pháp 2");
            // Phương pháp khác sử dụng HTMLAudioElement - cách 2
            playNotificationSound();
            vibrateDevice();
          }} 
          className="control-btn test-btn">
          Test Phương Pháp 2
        </button>
        
        <button 
          onClick={() => {
            console.log("Test button clicked - phương pháp 3 (Web Audio API)");
            // Phương pháp 3: Sử dụng Web Audio API với âm thanh tùy chỉnh
            playSound(selectedSound);
            vibrateDevice();
          }} 
          className="control-btn test-btn">
          Test Phương Pháp 3 (Web Audio)
        </button>
        
        <button 
          onClick={() => {
            console.log("Test button clicked - tất cả các phương pháp");
            // Thử tất cả các phương pháp phát âm thanh để đảm bảo
            ensureSound();
            vibrateDevice();
            
            // Mô phỏng hết timer (chỉ âm thanh và thông báo, không ghi lịch sử)
            console.log('TEST ONLY: Simulating timer completion without recording history');
            const completedMode = timer.mode;
            
            // Đặt cờ để đánh dấu đây là thử nghiệm, không ghi lịch sử
            currentSessionRef.current = { id: `test-${Date.now()}`, recorded: true };
            
            // Chỉ hiện thông báo và phát âm thanh, không ghi lịch sử
            showNotification(completedMode);
          }} 
          className="control-btn test-btn test-all-btn">
          Test Tất Cả Phương Pháp
        </button>
      </div>
      
      {sessionHistory.length > 0 && (
        <div className="history-section">
          <div className="history-header">
            <h3>Session History</h3>
            <button 
              onClick={() => {
                console.log('Clearing session history');
                setSessionHistory([]);
                currentSessionRef.current = { id: 'clear-history', recorded: false };
              }}
              className="clear-history-btn"
            >
              Xóa Lịch Sử
            </button>
          </div>
          <div className="history-list">
            {sessionHistory.map((session, index) => (
              <div key={index} className={`history-item ${session.type}`}>
                <span>{session.type === 'work' ? '🔨 Work' : '☕ Break'}</span>
                <span>{session.duration} minutes</span>
                <span>
                  {session.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Hiệu ứng flash màn hình cho desktop thay cho rung */}
      <FlashEffect trigger={flashTrigger} />
    </div>
  );
};

export default PomodoroTimer;