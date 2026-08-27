import React from 'react';

interface InterestChipProps {
  label: string;
  icon: string;
  selected: boolean;
  onPress: (label: string) => void;
  isDark?: boolean;
  cardBackground?: string;
  borderColor?: string;
}

export const InterestChip: React.FC<InterestChipProps> = ({
  label,
  icon,
  selected,
  onPress,
}) => {
  return (
    <button
      type="button"
      className={`chip ${selected ? 'active' : ''}`}
      onClick={() => onPress(label)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        marginRight: '8px',
        marginBottom: '8px',
      }}
    >
      <span style={{ fontSize: '1rem' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
};
