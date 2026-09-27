import React from 'react';
import { Search, Plus, Trophy } from 'lucide-react';
import { Tournament } from '../../../features/tournament/types';
import { TournamentCard } from '../../tournament/components/TournamentCard';

interface OrgTournamentsTabProps {
  orgName: string;
  tournaments: Tournament[];
  tourneySearch: string;
  onSearchChange: (val: string) => void;
  onCreateTourneyOpen: () => void;
  onDeleteTournament: (t: Tournament) => void;
  primaryColor?: string;
}

export const OrgTournamentsTab: React.FC<OrgTournamentsTabProps> = ({
  orgName,
  tournaments,
  tourneySearch,
  onSearchChange,
  onCreateTourneyOpen,
  onDeleteTournament,
  primaryColor = '#ffc905',
}) => {
  const filteredTournaments = tournaments.filter(t =>
    t.name.toLowerCase().includes(tourneySearch.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
          <Search size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Filter hosted tournaments..."
            value={tourneySearch}
            onChange={e => onSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.85rem 0.55rem 2.4rem',
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: '#ffffff',
              fontSize: '0.85rem',
            }}
          />
        </div>

        <button
          type="button"
          onClick={onCreateTourneyOpen}
          className="btn btn-primary"
          style={{ padding: '0.6rem 1.25rem', fontSize: '0.88rem', boxShadow: `0 2px 10px ${primaryColor}44` }}
        >
          <Plus size={16} />
          <span>Create Tournament</span>
        </button>
      </div>

      {filteredTournaments.length === 0 ? (
        <div
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <Trophy size={32} color="var(--color-gold-bright)" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            {tourneySearch ? 'No matching tournaments' : 'No tournaments hosted yet'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', maxWidth: '400px' }}>
            {tourneySearch
              ? 'Try adjusting your search filter.'
              : `Create your first tournament under ${orgName} to start organizing brackets.`}
          </p>
          {!tourneySearch && (
            <button
              type="button"
              onClick={onCreateTourneyOpen}
              className="btn btn-primary"
              style={{ marginTop: '0.5rem', padding: '0.55rem 1.25rem' }}
            >
              <Plus size={16} />
              <span>Create Tournament</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '1.5rem' }}>
          {filteredTournaments.map(t => (
            <TournamentCard
              key={t.id}
              tournament={t}
              showOrgBadge={false}
              onDeleteClick={onDeleteTournament}
            />
          ))}
        </div>
      )}
    </div>
  );
};
