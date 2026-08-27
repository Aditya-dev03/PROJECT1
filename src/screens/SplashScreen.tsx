import React, { useEffect, useState } from 'react';
import { WebIcon } from '../components/WebIcon';
import { useTheme } from '../context/ThemeContext';

export const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const { theme, isDark } = useTheme();
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFade(true);
      setTimeout(onFinish, 400);
    }, 1200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#D32F2F',
        background: 'linear-gradient(135deg, #FF5A5F 0%, #D32F2F 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        opacity: fade ? 0 : 1,
        transition: 'opacity 0.4s ease-out',
      }}
    >
      <div
        className="animate-scale-up"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '84px',
            height: '84px',
            borderRadius: '24px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.2)',
            border: '2px solid rgba(255, 255, 255, 0.4)',
          }}
        >
          <WebIcon name="airplane" size={44} color="#FFFFFF" />
        </div>

        <h1
          style={{
            color: '#FFFFFF',
            fontSize: '3rem',
            fontWeight: 900,
            letterSpacing: '-0.04em',
            margin: 0,
          }}
        >
          Travora
        </h1>
        <p
          style={{
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '1.1rem',
            fontWeight: 500,
            margin: 0,
          }}
        >
          Travel. Plan. Together.
        </p>
      </div>
    </div>
  );
};
