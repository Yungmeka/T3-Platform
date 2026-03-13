import { useEffect, useRef, useState } from 'react';

export default function Marquee({
  children,
  pauseOnHover = false,
  reverse = false,
  vertical = false,
  repeat = 4,
  gap = 16,
  speed = 40,
  className = '',
}) {
  const [animationDuration, setAnimationDuration] = useState('30s');
  const contentRef = useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      const size = vertical
        ? contentRef.current.offsetHeight
        : contentRef.current.offsetWidth;
      const duration = size / speed;
      setAnimationDuration(`${duration}s`);
    }
  }, [children, speed, vertical]);

  const direction = vertical
    ? reverse ? 'marquee-vertical-reverse' : 'marquee-vertical'
    : reverse ? 'marquee-reverse' : 'marquee';

  return (
    <div
      className={`marquee-container ${vertical ? 'marquee-vertical-container' : ''} ${className}`}
      style={{
        '--marquee-gap': `${gap}px`,
        '--marquee-duration': animationDuration,
      }}
    >
      <div
        className={`marquee-track ${direction} ${pauseOnHover ? 'marquee-pause-hover' : ''}`}
      >
        {Array.from({ length: repeat }).map((_, i) => (
          <div
            key={i}
            ref={i === 0 ? contentRef : undefined}
            className="marquee-content"
            style={{ gap: `${gap}px` }}
          >
            {children}
          </div>
        ))}
      </div>
    </div>
  );
}
