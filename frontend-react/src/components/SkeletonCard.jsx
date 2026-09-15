import React from 'react';

const SkeletonCard = ({ count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl shadow-soft border border-white/50 animate-pulse">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-slate-200 rounded-2xl"></div>
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-slate-200 rounded w-1/3"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-2 bg-slate-200 rounded w-full"></div>
            <div className="h-2 bg-slate-200 rounded w-5/6"></div>
            <div className="h-2 bg-slate-200 rounded w-4/6"></div>
          </div>
        </div>
      ))}
    </>
  );
};

export default SkeletonCard;
