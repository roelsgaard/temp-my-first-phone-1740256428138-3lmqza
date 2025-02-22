import React from 'react';

export function BuildNumber() {
  return (
    <p className="text-sm text-gray-500 mt-1">
      Build {import.meta.env.BUILD_NUMBER}
    </p>
  );
}