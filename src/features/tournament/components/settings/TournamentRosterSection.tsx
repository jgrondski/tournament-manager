import React from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Tournament } from '../../types';

interface TournamentRosterSectionProps {
  tournament: Tournament;
  totalCapacity: number;
}

export const TournamentRosterSection: React.FC<TournamentRosterSectionProps> = ({
  tournament,
  totalCapacity,
}) => {
  return (
    <section
      style={{
        background: 'var(--color-bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        padding: '0.85rem 1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={18} color="var(--color-gold-bright)" />
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
            Player Roster
          </h2>
        </div>
        <span
          style={{
            padding: '0.2rem 0.6rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(245, 158, 11, 0.15)',
            color: 'var(--color-gold-bright)',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          {(tournament.playersPool || []).length} / {totalCapacity} Capacity Registered
        </span>
        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
          Manage registrations &amp; pool imports in Players.
        </span>
      </div>

      <Link
        to={`/${tournament.slug}/manage/players`}
        className="btn btn-primary"
        style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', gap: '0.4rem', textDecoration: 'none' }}
      >
        <Users size={14} /> Go to Players
      </Link>
    </section>
  );
};
