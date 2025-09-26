// src/serviceWorkerRegistration.ts
// Đăng ký Service Worker cho ứng dụng Pomodoro

// Kiểm tra xem trình duyệt có hỗ trợ Service Worker không
const isServiceWorkerSupported = 'serviceWorker' in navigator;

// Hàm đăng ký Service Worker
export const registerServiceWorker = async () => {
  if (!isServiceWorkerSupported) {
    console.log('Service Worker không được hỗ trợ bởi trình duyệt của bạn');
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered successfully:', registration.scope);
    
    // Thiết lập kênh giao tiếp với Service Worker
    setupServiceWorkerCommunication();
    
    return true;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return false;
  }
};

// Hàm thiết lập giao tiếp với Service Worker
export const setupServiceWorkerCommunication = () => {
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('Message received from service worker:', event.data);
    
    // Xử lý các tin nhắn từ Service Worker
    if (event.data && event.data.type === 'TIMER_COMPLETED') {
      // Gửi sự kiện đến ứng dụng React
      window.dispatchEvent(new CustomEvent('timerCompleted', { 
        detail: {
          nextMode: event.data.nextMode,
          nextDuration: event.data.nextDuration
        }
      }));
    }
  });
};

// Hàm để gửi dữ liệu timer đến Service Worker
export const sendTimerDataToServiceWorker = (data: any) => {
  if (!isServiceWorkerSupported || !navigator.serviceWorker.controller) {
    console.log('Service Worker chưa sẵn sàng');
    return;
  }
  
  navigator.serviceWorker.controller.postMessage(data);
};

// Hàm để lấy trạng thái timer hiện tại từ Service Worker
export const getTimerStatus = async (): Promise<any> => {
  if (!isServiceWorkerSupported || !navigator.serviceWorker.controller) {
    console.log('Service Worker chưa sẵn sàng');
    return null;
  }
  
  // Tạo MessageChannel để nhận kết quả
  const messageChannel = new MessageChannel();
  
  return new Promise((resolve) => {
    // Đặt callback khi nhận được phản hồi
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data);
    };
    
    // Gửi yêu cầu đến Service Worker
    const controller = navigator.serviceWorker.controller;
    if (controller) {
      controller.postMessage(
        { type: 'GET_TIMER_STATUS' },
        [messageChannel.port2]
      );
    }
  });
};