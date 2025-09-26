// Khai báo kiểu cho AudioContext
interface AudioContextType {
  new (): AudioContext;
}

// Tạo AudioContext một cách an toàn với TypeScript
function createAudioContext() {
  const AudioContextClass = window.AudioContext as unknown as AudioContextType;
  return new AudioContextClass();
}

// Cấu hình âm thanh cho từng loại
interface SoundConfig {
  oscillatorType: OscillatorType;  // 'sine', 'square', 'sawtooth', 'triangle'
  frequency: number;               // Tần số (Hz)
  duration: number;                // Thời lượng (giây)
  attack: number;                  // Thời gian tăng âm lượng (giây)
  decay: number;                   // Thời gian giảm âm lượng (giây)
  maxGain: number;                 // Âm lượng tối đa (0-1)
  repeat?: number;                 // Số lần lặp lại
  interval?: number;               // Khoảng cách giữa các lần lặp (ms)
}

// Âm thanh mặc định cho từng loại âm thanh
const SOUND_PROFILES: Record<string, SoundConfig> = {
  beep: {
    oscillatorType: 'sine',
    frequency: 800,
    duration: 0.3,
    attack: 0.01,
    decay: 0.1,
    maxGain: 0.5,
    repeat: 1
  },
  bell: {
    oscillatorType: 'sine',
    frequency: 1200,
    duration: 0.8,
    attack: 0.01,
    decay: 0.7,
    maxGain: 0.4,
    repeat: 1
  },
  chime: {
    oscillatorType: 'triangle',
    frequency: 1000,
    duration: 0.6,
    attack: 0.05,
    decay: 0.5,
    maxGain: 0.4,
    repeat: 2,
    interval: 200
  },
  ding: {
    oscillatorType: 'square',
    frequency: 900,
    duration: 0.2,
    attack: 0.01,
    decay: 0.1,
    maxGain: 0.3,
    repeat: 2,
    interval: 150
  },
  success: {
    oscillatorType: 'triangle',
    frequency: 800,
    duration: 0.2,
    attack: 0.01,
    decay: 0.1,
    maxGain: 0.4,
    repeat: 3,
    interval: 100
  }
};

// Hàm tạo âm thanh tùy chỉnh dựa trên cấu hình
function createCustomSound(config: SoundConfig) {
  const audioContext = createAudioContext();
  
  // Tạo oscillator
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  // Thiết lập các thông số
  oscillator.type = config.oscillatorType;
  oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);
  
  // Thiết lập âm lượng và kết thúc âm thanh
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(config.maxGain, audioContext.currentTime + config.attack);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + config.attack + config.decay);
  
  // Kết nối và bắt đầu
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.start();
  oscillator.stop(audioContext.currentTime + config.duration);
  
  return audioContext;
}

// Hàm tạo âm thanh dựa trên loại âm thanh đã chọn
function createSound(soundType: string) {
  const config = SOUND_PROFILES[soundType] || SOUND_PROFILES.beep;
  return createCustomSound(config);
}

// Hàm phát âm thanh theo loại âm thanh
function playSound(soundType: string) {
  try {
    const config = SOUND_PROFILES[soundType] || SOUND_PROFILES.beep;
    
    // Phát âm thanh đầu tiên ngay lập tức
    createCustomSound(config);
    
    // Nếu có lặp lại, phát các âm thanh tiếp theo
    if (config.repeat && config.repeat > 1) {
      const interval = config.interval || 300;
      for (let i = 1; i < config.repeat; i++) {
        setTimeout(() => {
          createCustomSound(config);
        }, i * interval);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Lỗi khi phát âm thanh:', error);
    return false;
  }
}

// Export hàm để sử dụng
export { createSound, playSound, SOUND_PROFILES };