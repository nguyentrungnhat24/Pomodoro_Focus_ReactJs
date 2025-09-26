import { useState } from 'react';
import { playSound } from '../utils/audioUtils';

// Danh sách các âm thanh thông báo
const NOTIFICATION_SOUNDS = [
  { id: 'beep', name: 'Beep', file: 'beep.wav' },
  { id: 'bell', name: 'Bell', file: 'bell.wav' },
  { id: 'chime', name: 'Chime', file: 'chime.wav' },
  { id: 'ding', name: 'Ding', file: 'ding.wav' },
  { id: 'success', name: 'Success', file: 'success.wav' },
];

interface SoundPickerProps {
  selectedSound: string;
  onSoundChange: (soundId: string) => void;
}

const SoundPicker = ({ selectedSound, onSoundChange }: SoundPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Tìm sound hiện tại dựa trên id
  const currentSound = NOTIFICATION_SOUNDS.find(sound => sound.id === selectedSound) || NOTIFICATION_SOUNDS[0];

  // Phát preview của âm thanh
  const playSoundPreview = (soundId: string) => {
    const sound = NOTIFICATION_SOUNDS.find(s => s.id === soundId);
    if (sound) {
      console.log(`Previewing sound: ${soundId}`);
      
      // Thử phát file âm thanh
      try {
        // Tạo phần tử audio
        const audio = document.createElement('audio');
        
        // Thêm nhiều nguồn với các đường dẫn khác nhau
        [
          `./sounds/${sound.file}`,
          `/sounds/${sound.file}`,
          `sounds/${sound.file}`,
          `${window.location.origin}/sounds/${sound.file}`
        ].forEach(path => {
          const source = document.createElement('source');
          source.src = path;
          source.type = 'audio/wav';
          audio.appendChild(source);
        });
        
        // Thêm vào DOM để phát
        audio.style.display = 'none';
        document.body.appendChild(audio);
        
        // Phát và xóa sau khi phát xong
        audio.play()
          .then(() => {
            console.log(`Preview file sound ${soundId} played successfully`);
            audio.onended = () => document.body.removeChild(audio);
          })
          .catch(err => {
            console.error('Error playing file sound:', err);
            document.body.removeChild(audio);
            
            // Nếu không phát được file, sử dụng Web Audio API
            console.log('Falling back to Web Audio API');
            playSound(soundId);
          });
      } catch (error) {
        // Nếu có lỗi, sử dụng Web Audio API
        console.error('Error setting up audio playback:', error);
        playSound(soundId);
      }
    }
  };

  // Chọn âm thanh và đóng dropdown
  const selectSound = (soundId: string) => {
    onSoundChange(soundId);
    playSoundPreview(soundId);
    setIsOpen(false);
  };

  return (
    <div className="sound-picker">
      <h3>Âm thanh thông báo</h3>
      
      <div className="sound-selector">
        <button 
          className="sound-selector-button"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span>{currentSound.name}</span>
          <span className="sound-preview-icon" onClick={(e) => {
            e.stopPropagation();
            playSoundPreview(currentSound.id);
          }}>
            🔊
          </span>
          <span className="sound-dropdown-arrow">▼</span>
        </button>
        
        {isOpen && (
          <div className="sound-dropdown">
            {NOTIFICATION_SOUNDS.map((sound) => (
              <div 
                key={sound.id}
                className={`sound-option ${sound.id === selectedSound ? 'selected' : ''}`}
                onClick={() => selectSound(sound.id)}
              >
                <span>{sound.name}</span>
                <span 
                  className="sound-preview-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    playSoundPreview(sound.id);
                  }}
                >
                  🔊
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SoundPicker;