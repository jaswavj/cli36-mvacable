import React from 'react';
import { useLocation } from 'react-router-dom';

const titleFromPath = (path: string) => {
  const last = path.split('/').filter(Boolean).pop() || 'Page';
  return last
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const PlaceholderPage: React.FC<{ title?: string }> = ({ title }) => {
  const location = useLocation();
  const heading = title || titleFromPath(location.pathname);

  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ marginBottom: '0.5rem' }}>{heading}</h2>
      <p style={{ color: 'var(--color-text-muted)' }}>
        This screen is reserved for the next step. Menu navigation is in place.
      </p>
    </div>
  );
};

export default PlaceholderPage;
