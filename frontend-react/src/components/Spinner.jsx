import React from 'react';

const Spinner = ({ size = 'md', text = 'Memuat data...' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4">
      <div className={`relative ${sizeClasses[size]}`}>
        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
        {/* Inner Spinning Ring */}
        <div className="absolute inset-0 rounded-full border-4 border-mag-green border-t-transparent animate-spin"></div>
      </div>
      {text && (
        <p className="text-xs font-black text-slate-400 uppercase tracking-wider animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
};

export default Spinner;
