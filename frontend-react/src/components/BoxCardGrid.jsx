import React from 'react';

const GRID_STYLES = {
  1: 'grid grid-cols-1 gap-6 w-full max-w-xl mx-auto',
  2: 'grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-4xl mx-auto',
  3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full',
  4: 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 w-full'
};

const resolveColumns = (count) => {
  if (!count || count < 1) return 1;
  if (count > 4) return 4;
  return count;
};

export default function BoxCardGrid({ count = 1, children, className = '' }) {
  const columns = resolveColumns(count);
  return (
    <div className={`${GRID_STYLES[columns]} ${className}`.trim()}>
      {children}
    </div>
  );
}
