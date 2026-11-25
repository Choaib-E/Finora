import React from 'react';

interface FinoraLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export const FinoraLogo: React.FC<FinoraLogoProps> = ({ size = 'md' }) => {
  const boxSize =
    size === 'sm' ? 'h-8 w-8 rounded-lg' : size === 'lg' ? 'h-11 w-11 rounded-xl' : 'h-9 w-9 rounded-xl';
  const svgSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

  return (
    <div
      className={`flex ${boxSize} items-center justify-center bg-[#315CF5] text-white shadow-sm dark:bg-[#6D8AFF] dark:text-[#0B1120]`}
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={svgSize}
        aria-hidden="true"
      >
        <rect x="14" y="12" width="10" height="40" rx="4.5" fill="currentColor" />
        <rect x="14" y="12" width="36" height="10" rx="4.5" fill="currentColor" />
        <rect x="14" y="29" width="24" height="9.5" rx="4.5" fill="currentColor" />
        <circle cx="45" cy="45" r="6.5" fill="#34D399" />
      </svg>
    </div>
  );
};
