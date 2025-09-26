import { useEffect, useState } from 'react';
import './FlashEffect.css';

// Component hiệu ứng flash màn hình thay thế cho rung trên desktop
const FlashEffect = ({ trigger = 0 }) => {
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    console.log('FlashEffect: trigger changed to', trigger);
    
    // Chỉ hiển thị hiệu ứng khi trigger thay đổi (trừ lần đầu tiên)
    if (trigger === 0) return;
    
    // Kích hoạt hiệu ứng và tạo key mới để force render
    console.log('FlashEffect: activating flash');
    setIsFlashing(true);
    setFlashKey(prev => prev + 1);
    
    // Tắt hiệu ứng sau 5 giây
    const timer = setTimeout(() => {
      console.log('FlashEffect: deactivating flash after timeout');
      setIsFlashing(false);
    }, 1000);
    
    return () => {
      console.log('FlashEffect: cleaning up');
      clearTimeout(timer);
    };
  }, [trigger]);

  // Debug render
  console.log('FlashEffect rendering, isFlashing:', isFlashing, 'key:', flashKey);

  // Không render gì nếu không đang flash
  if (!isFlashing) return null;

  return <div key={flashKey} className="flash-overlay active" />;
};

export default FlashEffect;