import React from 'react';
import { PlayerProfile } from '../../tournament/types';
import { CountryFlag } from '../flagUtils';

export interface PlayerAvatarProps {
  player?: Pick<PlayerProfile, 'avatarType' | 'avatarUrl' | 'country' | 'name'> | null;
  country?: string;
  size?: number | string;
  showName?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  player,
  country,
  size = 20,
  showName = false,
  className,
  style,
}) => {
  const finalCountry = player?.country ?? country;
  const isCustom = player?.avatarType === 'custom' && Boolean(player?.avatarUrl);

  if (isCustom && player?.avatarUrl) {
    const dim = typeof size === 'number' ? `${size}px` : size;
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${className || ''}`}
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        <img
          src={player.avatarUrl}
          alt={player.name || 'Player'}
          style={{
            width: dim,
            height: dim,
            minWidth: dim,
            minHeight: dim,
            borderRadius: '50%',
            objectFit: 'cover',
            display: 'inline-block',
            verticalAlign: 'middle',
            ...style,
          }}
        />
        {showName && player.name && <span>{player.name}</span>}
      </span>
    );
  }

  return (
    <CountryFlag
      country={finalCountry}
      showName={showName}
      className={className}
      style={style}
    />
  );
};
