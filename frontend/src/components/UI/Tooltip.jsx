import { useState } from 'react';

const Tooltip = ({ children, content, position = 'top', multiline = false, maxWidth = 'max-w-xs' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const handleClick = () => {
    if (window.innerWidth < 768) {
      setIsMobile(true);
      setIsVisible(!isVisible);
    }
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => !isMobile && setIsVisible(true)}
        onMouseLeave={() => !isMobile && setIsVisible(false)}
        onClick={handleClick}
        className="cursor-pointer"
      >
        {children}
      </div>
      {isVisible && content && (
        <div
          className={`absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg ${
            multiline ? `${maxWidth} whitespace-normal` : 'whitespace-nowrap'
          } ${positionStyles[position]}`}
        >
          {content}
          <div className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
            position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' :
            position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' :
            position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' :
            'left-[-4px] top-1/2 -translate-y-1/2'
          }`} />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
