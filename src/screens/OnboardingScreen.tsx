import React, { useState } from 'react';
import { WebIcon } from '../components/WebIcon';
import { Button } from '../components/Button';
import { onboardingData } from '../data/mock';
import { useTheme } from '../context/ThemeContext';

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const { theme, isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentSlide = onboardingData[currentIndex];

  const handleNext = () => {
    if (currentIndex === onboardingData.length - 1) {
      onComplete();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: theme.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        className="glass-panel animate-scale-up"
        style={{
          width: '100%',
          maxWidth: '540px',
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: 'var(--shadow-xl)',
          position: 'relative',
        }}
      >
        {/* Skip button */}
        <button
          onClick={onComplete}
          style={{
            position: 'absolute',
            top: '20px',
            right: '24px',
            fontSize: '0.88rem',
            fontWeight: 600,
            color: theme.textLight,
            cursor: 'pointer',
          }}
        >
          Skip
        </button>

        {/* Hero Image Card */}
        <div
          style={{
            width: '100%',
            height: '280px',
            borderRadius: '24px',
            overflow: 'hidden',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <img
            src={currentSlide.image}
            alt={currentSlide.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.5s ease',
            }}
          />
        </div>

        {/* Logo and App name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'var(--primary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <WebIcon name="airplane" size={20} color={theme.primary} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.text }}>
            Travora
          </span>
        </div>

        {/* Slide Title & Description */}
        <div style={{ textAlign: 'center', marginBottom: '28px', minHeight: '90px' }}>
          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: theme.text,
              marginBottom: '10px',
            }}
          >
            {currentSlide.title}
          </h2>
          <p
            style={{
              fontSize: '0.95rem',
              color: theme.textLight,
              lineHeight: 1.5,
              maxWidth: '400px',
              margin: '0 auto',
            }}
          >
            {currentSlide.description}
          </p>
        </div>

        {/* Dot Pagination */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
          {onboardingData.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              style={{
                height: '8px',
                width: i === currentIndex ? '24px' : '8px',
                borderRadius: '4px',
                backgroundColor: i === currentIndex ? theme.primary : theme.border,
                transition: 'all 0.3s ease',
                border: 'none',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        {/* CTA Button */}
        <Button
          title={currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Continue →'}
          onClick={handleNext}
        />
      </div>
    </div>
  );
};
