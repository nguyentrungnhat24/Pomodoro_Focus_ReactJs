// src/sw.js
// Đây là Service Worker để giữ Pomodoro Timer chạy trong nền

// Đặt tên cho cache
const CACHE_NAME = 'pomodoro-app-cache-v1';

// Biến để theo dõi timer trong service worker
let timerData = {
  isRunning: false,
  startTime: null,
  endTime: null,
  mode: 'work', // 'work' hoặc 'break'
  duration: 25 * 60 * 1000, // 25 phút mặc định
};

// Các file cần cache
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/App.css',
  '/src/components/PomodoroTimer.tsx',
  '/src/components/PomodoroTimer.css',
];

// Cài đặt Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching files');
      return cache.addAll(urlsToCache);
    })
  );
});

// Kích hoạt Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  // Xóa các cache cũ
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Xử lý việc fetch từ cache hoặc network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Trả về từ cache nếu có
      if (response) {
        return response;
      }
      // Không có trong cache, fetch từ network
      return fetch(event.request);
    })
  );
});

// Xử lý tin nhắn từ trang chính
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);

  if (event.data && event.data.type === 'START_TIMER') {
    // Bắt đầu timer
    timerData = {
      isRunning: true,
      startTime: Date.now(),
      endTime: Date.now() + event.data.duration,
      mode: event.data.mode,
      duration: event.data.duration,
    };
    
    // Lập lịch gửi thông báo khi kết thúc
    scheduleNotification();
    
  } else if (event.data && event.data.type === 'PAUSE_TIMER') {
    // Dừng timer
    timerData.isRunning = false;
    
  } else if (event.data && event.data.type === 'RESET_TIMER') {
    // Reset timer
    timerData = {
      isRunning: false,
      startTime: null,
      endTime: null,
      mode: event.data.mode,
      duration: event.data.duration,
    };
    
  } else if (event.data && event.data.type === 'GET_TIMER_STATUS') {
    // Gửi lại trạng thái hiện tại
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage({ 
        timerData,
        currentTime: Date.now()
      });
    }
  }
});

// Hàm lập lịch cho thông báo
function scheduleNotification() {
  if (!timerData.isRunning) return;
  
  const timeRemaining = timerData.endTime - Date.now();
  
  if (timeRemaining <= 0) {
    // Timer đã kết thúc
    showNotification();
    
    // Chuyển đổi tự động giữa work và break
    const newMode = timerData.mode === 'work' ? 'break' : 'work';
    const newDuration = newMode === 'work' ? 25 * 60 * 1000 : 5 * 60 * 1000;
    
    timerData = {
      isRunning: false,  // Không tự động chạy phiên mới
      startTime: null,
      endTime: null,
      mode: newMode,
      duration: newDuration,
    };
    
    // Thông báo cho tất cả client biết
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'TIMER_COMPLETED',
          nextMode: newMode,
          nextDuration: newDuration
        });
      });
    });
    
  } else {
    // Còn thời gian, kiểm tra lại sau 1 giây
    setTimeout(() => {
      scheduleNotification();
    }, 1000);
  }
}

// Hiển thị thông báo
async function showNotification() {
  const title = timerData.mode === 'work' ? 'Phiên làm việc kết thúc!' : 'Phiên nghỉ kết thúc!';
  const options = {
    body: timerData.mode === 'work' 
      ? 'Đã đến lúc nghỉ ngơi 5 phút.' 
      : 'Đã đến lúc quay lại làm việc 25 phút.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200, 100, 200, 100, 200],
    tag: 'pomodoro-notification',
    renotify: true
  };

  try {
    await self.registration.showNotification(title, options);
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}

// Xử lý khi người dùng nhấn vào thông báo
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Kiểm tra xem có window nào đang mở không
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      
      // Nếu không có window nào đang mở, mở một cái mới
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});