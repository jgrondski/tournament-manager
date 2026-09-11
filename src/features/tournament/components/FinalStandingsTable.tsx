import React, { useState, useMemo } from 'react';
import { Tournament, TournamentTier, PlayerProfile } from '../types';
import { calculateGlobalStandings, GlobalStandingRow } from '../standings';
import { colorWithAlpha } from '../../bracket/colorUtils';
import { PlayerDetailDrawer } from '../../qualifiers/components/PlayerDetailDrawer';
import {
  Trophy,
  Medal,
  Award,
  User,
  Layers,
  Search,
  Swords,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Flame,
} from 'lucide-react';

interface FinalStandingsTableProps {
  tournament: Tournament;
  initialTierId?: string;
}

export const FinalStandingsTable: React.FC<FinalStandingsTableProps> = ({
  tournament,
  initialTierId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>(initialTierId || 'ALL');
  const [selectedPlayerForDrawer, setSelectedPlayerForDrawer] = useState<PlayerProfile | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handlePlayerClick = (pId: string, pName: string, country?: string, playstyle?: 'DAS' | 'Rolling' | 'Hypertap') => {
    const profile = (tournament.playersPool || []).find(p => p.id === pId) || {
      id: pId,
      name: pName,
      country,
      personalBest: 0,
      playstyle: playstyle || 'DAS',
    };
    setSelectedPlayerForDrawer(profile);
    setIsDrawerOpen(true);
  };

  const globalRows = useMemo(() => {
    return calculateGlobalStandings(tournament);
  }, [tournament]);

  // Derive summary metrics
  const totalCompetitors = globalRows.length;
  const championRow = globalRows.find(r => r.finalRank === 1);
  const completedMatchesCount = useMemo(() => {
    return Object.values(tournament.matchScores || {}).filter(m => m.isComplete).length;
  }, [tournament.matchScores]);

  // Section / Tier counts for filter chips
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: totalCompetitors, DNQ: 0, DQ: 0 };
    tournament.tiers.forEach(t => {
      counts[t.id] = 0;
    });

    globalRows.forEach(r => {
      if (r.isDisqualified) {
        counts.DQ = (counts.DQ || 0) + 1;
      } else if (r.isDNQ) {
        counts.DNQ = (counts.DNQ || 0) + 1;
      } else if (r.tier?.id) {
        counts[r.tier.id] = (counts[r.tier.id] || 0) + 1;
      }
    });
    return counts;
  }, [globalRows, tournament.tiers, totalCompetitors]);

  // Filter rows based on search and section filter
  const filteredRows = useMemo(() => {
    return globalRows.filter(row => {
      // Search match
      const query = searchTerm.trim().toLowerCase();
      if (query) {
        const nameMatch = row.player.name.toLowerCase().includes(query);
        const countryMatch = row.player.country?.toLowerCase().includes(query);
        const playstyleMatch = row.player.playstyle?.toLowerCase().includes(query);
        const tierMatch = row.tier?.name.toLowerCase().includes(query);
        if (!nameMatch && !countryMatch && !playstyleMatch && !tierMatch) {
          return false;
        }
      }

      // Filter chip match
      if (selectedFilter === 'ALL') return true;
      if (selectedFilter === 'DNQ') return row.isDNQ && !row.isDisqualified;
      if (selectedFilter === 'DQ') return row.isDisqualified;
      return row.tier?.id === selectedFilter;
    });
  }, [globalRows, searchTerm, selectedFilter]);

  // Group rows by Section (Tier 1, Tier 2..., DNQ, DQ) when viewing ALL
  interface StandingsSection {
    id: string;
    title: string;
    subtitle?: string;
    tier?: TournamentTier;
    color: string;
    isDNQ?: boolean;
    isDQ?: boolean;
    rows: GlobalStandingRow[];
  }

  const sections: StandingsSection[] = useMemo(() => {
    if (selectedFilter !== 'ALL') {
      // Single section matching filter
      if (selectedFilter === 'DNQ') {
        return [{
          id: 'dnq',
          title: 'Did Not Qualify (DNQ)',
          subtitle: 'Competitors below tournament bracket qualification cutoffs',
          color: '#64748b',
          isDNQ: true,
          rows: filteredRows,
        }];
      }
      if (selectedFilter === 'DQ') {
        return [{
          id: 'dq',
          title: 'Disqualified (DQ)',
          subtitle: 'Disqualified competitors removed from official placement',
          color: '#ef4444',
          isDQ: true,
          rows: filteredRows,
        }];
      }
      const tier = tournament.tiers.find(t => t.id === selectedFilter);
      return [{
        id: selectedFilter,
        title: tier?.name || 'Tier',
        subtitle: `${tier?.playerCount || 0} Bracket Competitors • Best of ${tier?.bestOf || 3}`,
        tier,
        color: tier?.primaryColor || '#f59e0b',
        rows: filteredRows,
      }];
    }

    // When viewing ALL: group consecutively by tier / DNQ / DQ
    const grouped: StandingsSection[] = [];
    const sortedTiers = [...tournament.tiers].sort((a, b) => a.priority - b.priority);

    for (const tier of sortedTiers) {
      const tierRows = filteredRows.filter(r => r.tier?.id === tier.id);
      if (tierRows.length > 0) {
        grouped.push({
          id: tier.id,
          title: tier.name,
          subtitle: `${tier.playerCount} Bracket Competitors • Best of ${tier.bestOf}`,
          tier,
          color: tier.primaryColor || '#f59e0b',
          rows: tierRows,
        });
      }
    }

    const dnqRows = filteredRows.filter(r => r.isDNQ && !r.isDisqualified);
    if (dnqRows.length > 0) {
      grouped.push({
        id: 'dnq',
        title: 'Did Not Qualify (DNQ)',
        subtitle: 'Competitors below tournament bracket qualification cutoffs',
        color: '#64748b',
        isDNQ: true,
        rows: dnqRows,
      });
    }

    const dqRows = filteredRows.filter(r => r.isDisqualified);
    if (dqRows.length > 0) {
      grouped.push({
        id: 'dq',
        title: 'Disqualified (DQ)',
        subtitle: 'Disqualified competitors removed from official placement',
        color: '#ef4444',
        isDQ: true,
        rows: dqRows,
      });
    }

    return grouped;
  }, [selectedFilter, filteredRows, tournament.tiers]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header & Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.65rem', letterSpacing: '-0.01em' }}>
            <Trophy color="var(--color-gold-bright)" size={28} />
            Tournament Standings
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem', maxWidth: '650px', lineHeight: 1.5 }}>
            Official global tournament rankings determined through bracket completion and the Competitive Intra-Round Exit Tiebreaker engine.
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', minWidth: '260px' }}>
          <Search size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search player, country, style..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.85rem 0.55rem 2.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-surface)',
              color: 'var(--color-text-primary)',
              fontSize: '0.85rem',
              outline: 'none',
              transition: 'border-color 0.15s ease',
            }}
          />
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {/* Champion Card */}
        <div
          style={{
            background: championRow
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(245, 158, 11, 0.04) 100%)'
              : 'var(--color-bg-surface)',
            border: championRow ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            boxShadow: championRow ? '0 0 15px rgba(245, 158, 11, 0.12)' : 'none',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: championRow ? 'rgba(245, 158, 11, 0.2)' : 'var(--color-bg-surface-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: championRow ? 'var(--color-gold-bright)' : 'var(--color-text-muted)',
              flexShrink: 0,
            }}
          >
            <Trophy size={22} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Tournament Champion
            </div>
            <div
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: championRow ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {championRow ? championRow.player.name : 'In Progress'}
            </div>
          </div>
        </div>

        {/* Total Competitors */}
        <div
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(56, 189, 248, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
              flexShrink: 0,
            }}
          >
            <User size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Competitors
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }} className="tabular-nums">
              {totalCompetitors}
            </div>
          </div>
        </div>

        {/* Completed Matches */}
        <div
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(168, 85, 247, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c084fc',
              flexShrink: 0,
            }}
          >
            <Swords size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Completed Matches
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }} className="tabular-nums">
              {completedMatchesCount}
            </div>
          </div>
        </div>

        {/* Tiers Active */}
        <div
          style={{
            background: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
              flexShrink: 0,
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Tournament Tiers
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }} className="tabular-nums">
              {tournament.tiers.length}
            </div>
          </div>
        </div>
      </div>

      {/* Section Filter Pills */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedFilter('ALL')}
          style={{
            padding: '0.4rem 0.9rem',
            borderRadius: 'var(--radius-full)',
            border: selectedFilter === 'ALL' ? '1px solid var(--color-gold-bright)' : '1px solid var(--color-border)',
            background: selectedFilter === 'ALL' ? 'rgba(245, 158, 11, 0.15)' : 'var(--color-bg-surface)',
            color: selectedFilter === 'ALL' ? 'var(--color-gold-bright)' : 'var(--color-text-secondary)',
            fontWeight: selectedFilter === 'ALL' ? 700 : 500,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.15s ease',
          }}
        >
          <span>All Standings</span>
          <span style={{ fontSize: '0.75rem', opacity: 0.8 }} className="tabular-nums">({tierCounts.ALL})</span>
        </button>

        {tournament.tiers.map(t => {
          const isSelected = selectedFilter === t.id;
          const tColor = t.primaryColor || '#f59e0b';
          const count = tierCounts[t.id] || 0;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedFilter(t.id)}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: 'var(--radius-full)',
                border: isSelected ? `1px solid ${colorWithAlpha(tColor, 0.6, 'var(--color-gold)')}` : '1px solid var(--color-border)',
                background: isSelected ? colorWithAlpha(tColor, 0.18, 'var(--color-gold-bg)') : 'var(--color-bg-surface)',
                color: isSelected ? tColor : 'var(--color-text-secondary)',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: tColor,
                  boxShadow: isSelected ? `0 0 6px ${tColor}` : 'none',
                }}
              />
              <span>{t.name}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }} className="tabular-nums">({count})</span>
            </button>
          );
        })}

        {(tierCounts.DNQ || 0) > 0 && (
          <button
            onClick={() => setSelectedFilter('DNQ')}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: 'var(--radius-full)',
              border: selectedFilter === 'DNQ' ? '1px solid #94a3b8' : '1px solid var(--color-border)',
              background: selectedFilter === 'DNQ' ? 'rgba(148, 163, 184, 0.18)' : 'var(--color-bg-surface)',
              color: selectedFilter === 'DNQ' ? '#f1f5f9' : 'var(--color-text-secondary)',
              fontWeight: selectedFilter === 'DNQ' ? 700 : 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease',
            }}
          >
            <span>DNQ</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }} className="tabular-nums">({tierCounts.DNQ})</span>
          </button>
        )}

        {(tierCounts.DQ || 0) > 0 && (
          <button
            onClick={() => setSelectedFilter('DQ')}
            style={{
              padding: '0.4rem 0.9rem',
              borderRadius: 'var(--radius-full)',
              border: selectedFilter === 'DQ' ? '1px solid #ef4444' : '1px solid var(--color-border)',
              background: selectedFilter === 'DQ' ? 'rgba(239, 68, 68, 0.18)' : 'var(--color-bg-surface)',
              color: selectedFilter === 'DQ' ? '#fca5a5' : 'var(--color-text-secondary)',
              fontWeight: selectedFilter === 'DQ' ? 700 : 500,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease',
            }}
          >
            <span>Disqualified</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }} className="tabular-nums">({tierCounts.DQ})</span>
          </button>
        )}
      </div>

      {/* Standings Table or Empty State */}
      {filteredRows.length === 0 ? (
        <div
          style={{
            background: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--color-bg-surface-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-muted)',
            }}
          >
            <Layers size={28} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {searchTerm ? 'No Competitors Matched Search' : 'Standings Awaiting Tournament Results'}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: '440px', lineHeight: 1.5 }}>
            {searchTerm
              ? `No tournament participants match "${searchTerm}". Clear search or adjust filter.`
              : 'Standings will automatically calculate and update here as bracket matches are played and concluded.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            overflowX: 'auto',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '950px' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-surface-highlight)', borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ ...thStyle, width: '85px', textAlign: 'center' }}>Rank</th>
                <th style={{ ...thStyle, minWidth: '200px' }}>Competitor</th>
                <th style={{ ...thStyle, width: '130px', textAlign: 'center' }}>Qual & Delta</th>
                <th style={{ ...thStyle, width: '140px', textAlign: 'center' }}>Stage Reached</th>
                <th style={{ ...thStyle, minWidth: '180px' }}>Exit Match / Loss Avg</th>
                <th style={{ ...thStyle, width: '90px', textAlign: 'center' }}>Match Rec</th>
                <th style={{ ...thStyle, width: '90px', textAlign: 'center' }}>Game Rec</th>
                <th style={{ ...thStyle, width: '120px', textAlign: 'right', paddingRight: '1.25rem' }}>Game Score Avg</th>
              </tr>
            </thead>
            <tbody>
              {sections.map(section => (
                <React.Fragment key={section.id}>
                  {/* Tier / Section Header Divider Row */}
                  <tr
                    style={{
                      background: section.isDQ
                        ? 'rgba(239, 68, 68, 0.12)'
                        : section.isDNQ
                        ? 'rgba(100, 116, 139, 0.12)'
                        : colorWithAlpha(section.color, 0.1, 'rgba(245, 158, 11, 0.08)'),
                      borderTop: '2px solid var(--color-border)',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    <td
                      colSpan={8}
                      style={{
                        padding: '0.65rem 1rem',
                        borderLeft: `4px solid ${section.color}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          {section.isDQ ? (
                            <AlertTriangle size={17} color="#ef4444" />
                          ) : section.isDNQ ? (
                            <Minus size={17} color="#94a3b8" />
                          ) : (
                            <Flame size={17} color={section.color} />
                          )}
                          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: section.isDQ ? '#fca5a5' : section.color }}>
                            {section.title}
                          </span>
                          {section.subtitle && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                              • {section.subtitle}
                            </span>
                          )}
                        </div>

                        <span
                          className="tabular-nums"
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.5rem',
                            borderRadius: 'var(--radius-full)',
                            background: 'rgba(255, 255, 255, 0.08)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          {section.rows.length} {section.rows.length === 1 ? 'Competitor' : 'Competitors'}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Competitor Rows */}
                  {section.rows.map((row, idx) => {
                    const isOverallChamp = row.finalRank === 1;
                    const isRunnerUp = row.finalRank === 2;
                    const isThird = row.finalRank === 3;
                    const isTierChamp = !isOverallChamp && row.eliminationRound === 'Champion';

                    const tierColor = row.tier?.primaryColor || section.color || '#f59e0b';

                    // Rank Delta formatting
                    const delta = row.rankDelta;
                    const isPositiveDelta = typeof delta === 'number' && delta > 0;
                    const isNegativeDelta = typeof delta === 'number' && delta < 0;

                    return (
                      <tr
                        key={row.player.id}
                        style={{
                          background: isOverallChamp
                            ? 'rgba(245, 158, 11, 0.12)'
                            : isRunnerUp
                            ? 'rgba(56, 189, 248, 0.08)'
                            : isTierChamp
                            ? colorWithAlpha(tierColor, 0.08, 'rgba(245, 158, 11, 0.06)')
                            : idx % 2 === 0
                            ? 'var(--color-bg-surface)'
                            : 'var(--color-bg-surface-elevated)',
                          borderBottom: '1px solid var(--color-border-subtle)',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        {/* 1. Final Placement / Rank */}
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {isOverallChamp ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-gold-bright)', fontWeight: 800, fontSize: '0.95rem' }}>
                              <Trophy size={18} />
                              <span>1st</span>
                            </div>
                          ) : isRunnerUp ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#38bdf8', fontWeight: 700, fontSize: '0.9rem' }}>
                              <Medal size={18} />
                              <span>2nd</span>
                            </div>
                          ) : isThird ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#f59e0b', fontWeight: 700, fontSize: '0.88rem' }}>
                              <Award size={17} />
                              <span>3rd</span>
                            </div>
                          ) : row.isDisqualified ? (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.15rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(239, 68, 68, 0.2)',
                                color: '#f87171',
                                fontWeight: 800,
                                fontSize: '0.75rem',
                              }}
                            >
                              DQ
                            </span>
                          ) : row.isDNQ ? (
                            <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                              #{row.finalRank}
                            </span>
                          ) : (
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span className="tabular-nums" style={{ fontWeight: 700, color: isTierChamp ? tierColor : 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
                                #{row.finalRank}
                              </span>
                              {isTierChamp && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    color: tierColor,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  Winner
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 2. Competitor Info */}
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={() => handlePlayerClick(row.player.id, row.player.name, row.player.country, row.player.playstyle)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  fontWeight: isOverallChamp ? 800 : isRunnerUp || isTierChamp ? 700 : 600,
                                  color: isOverallChamp ? 'var(--color-gold-bright)' : '#ffffff',
                                  fontSize: isOverallChamp ? '0.98rem' : '0.9rem',
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  transition: 'color 0.15s ease',
                                }}
                                onMouseEnter={e => {
                                  e.currentTarget.style.color = 'var(--color-gold-bright)';
                                  e.currentTarget.style.textDecoration = 'underline';
                                }}
                                onMouseLeave={e => {
                                  e.currentTarget.style.color = isOverallChamp ? 'var(--color-gold-bright)' : '#ffffff';
                                  e.currentTarget.style.textDecoration = 'none';
                                }}
                                title="View player tournament profile"
                              >
                                {row.player.name}
                              </button>

                              {row.player.country && (
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--color-text-muted)',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    padding: '0.1rem 0.35rem',
                                    borderRadius: 'var(--radius-sm)',
                                  }}
                                >
                                  {row.player.country}
                                </span>
                              )}

                              {row.player.playstyle && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 600,
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: 'var(--radius-sm)',
                                    background:
                                      row.player.playstyle === 'Rolling'
                                        ? 'rgba(56, 189, 248, 0.15)'
                                        : row.player.playstyle === 'Hypertap'
                                        ? 'rgba(244, 63, 94, 0.15)'
                                        : 'rgba(245, 158, 11, 0.15)',
                                    color:
                                      row.player.playstyle === 'Rolling'
                                        ? '#38bdf8'
                                        : row.player.playstyle === 'Hypertap'
                                        ? '#fb7185'
                                        : '#fbbf24',
                                  }}
                                >
                                  {row.player.playstyle}
                                </span>
                              )}
                            </div>

                            {/* Tier seed info if bracket player */}
                            {row.player.tierSeed && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                Bracket Seed #{row.player.tierSeed}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 3. Qual Seed & Rank Delta */}
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span className="tabular-nums" style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                                {row.qualRank ? `Seed #${row.qualRank}` : '—'}
                              </span>

                              {/* Delta Badge */}
                              {typeof delta === 'number' && !row.isDNQ && !row.isDisqualified && (
                                <span
                                  title={`Qual Rank #${row.qualRank} → Final #${row.finalRank}`}
                                  className="tabular-nums"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.15rem',
                                    padding: '0.1rem 0.35rem',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    background: isPositiveDelta
                                      ? 'rgba(16, 185, 129, 0.18)'
                                      : isNegativeDelta
                                      ? 'rgba(244, 63, 94, 0.18)'
                                      : 'rgba(255, 255, 255, 0.08)',
                                    color: isPositiveDelta
                                      ? '#34d399'
                                      : isNegativeDelta
                                      ? '#fb7185'
                                      : 'var(--color-text-muted)',
                                  }}
                                >
                                  {isPositiveDelta ? (
                                    <>
                                      <TrendingUp size={11} />
                                      <span>+{delta}</span>
                                    </>
                                  ) : isNegativeDelta ? (
                                    <>
                                      <TrendingDown size={11} />
                                      <span>{delta}</span>
                                    </>
                                  ) : (
                                    <>
                                      <Minus size={11} />
                                      <span>0</span>
                                    </>
                                  )}
                                </span>
                              )}
                            </div>

                            {row.qualScore !== undefined && (
                              <span className="tabular-nums" style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                {row.qualScore.toLocaleString()} pts
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. Stage Reached */}
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.55rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: isOverallChamp
                                ? 'rgba(245, 158, 11, 0.2)'
                                : isRunnerUp
                                ? 'rgba(56, 189, 248, 0.15)'
                                : isTierChamp
                                ? colorWithAlpha(tierColor, 0.2, 'rgba(245, 158, 11, 0.15)')
                                : row.isDisqualified
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(255, 255, 255, 0.06)',
                              color: isOverallChamp
                                ? 'var(--color-gold-bright)'
                                : isRunnerUp
                                ? '#38bdf8'
                                : isTierChamp
                                ? tierColor
                                : row.isDisqualified
                                ? '#fca5a5'
                                : 'var(--color-text-secondary)',
                            }}
                          >
                            {row.eliminationRound || 'Participant'}
                          </span>
                        </td>

                        {/* 5. Exit Match Details / Tiebreaker Loss Avg */}
                        <td style={tdStyle}>
                          {row.exitDetails ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                  {row.exitDetails.scoreDisplay}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                  vs {row.exitDetails.opponentName || 'Opponent'}
                                </span>
                                {row.exitDetails.isForfeit && (
                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      padding: '0.05rem 0.35rem',
                                      borderRadius: 'var(--radius-sm)',
                                      background: 'rgba(239, 68, 68, 0.2)',
                                      color: '#f87171',
                                      fontWeight: 600,
                                    }}
                                  >
                                    Forfeit
                                  </span>
                                )}
                              </div>
                              <div className="tabular-nums" style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                Loss Avg: <strong style={{ color: 'var(--color-text-secondary)' }}>{row.exitDetails.avgLossScore.toLocaleString()}</strong>
                              </div>
                            </div>
                          ) : isOverallChamp ? (
                            <div style={{ fontSize: '0.82rem', color: 'var(--color-gold-bright)', fontWeight: 600 }}>
                              👑 Undefeated Champion
                            </div>
                          ) : isTierChamp ? (
                            <div style={{ fontSize: '0.82rem', color: tierColor, fontWeight: 600 }}>
                              Bracket Champion
                            </div>
                          ) : row.isDNQ ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                              Did Not Qualify
                            </span>
                          ) : row.isDisqualified ? (
                            <span style={{ fontSize: '0.8rem', color: '#f87171' }}>
                              Disqualified
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                              —
                            </span>
                          )}
                        </td>

                        {/* 6. Match Record */}
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span
                            className="tabular-nums"
                            style={{
                              fontWeight: 600,
                              color: row.stats.matchesPlayed > 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                            }}
                          >
                            {row.stats.matchRecordDisplay}
                          </span>
                        </td>

                        {/* 7. Game Record */}
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span
                            className="tabular-nums"
                            style={{
                              fontWeight: 600,
                              color: row.stats.gamesWon + row.stats.gamesLost > 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                            }}
                          >
                            {row.stats.gameRecordDisplay}
                          </span>
                        </td>

                        {/* 8. Overall Game Average */}
                        <td style={{ ...tdStyle, textAlign: 'right', paddingRight: '1.25rem' }}>
                          {row.stats.overallGameAvg > 0 ? (
                            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <span className="tabular-nums" style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '0.88rem' }}>
                                {row.stats.overallGameAvg.toLocaleString()}
                              </span>
                              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                                {row.stats.totalGamesWithScore} {row.stats.totalGamesWithScore === 1 ? 'game' : 'games'}
                              </span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedPlayerForDrawer && (
        <PlayerDetailDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedPlayerForDrawer(null);
          }}
          player={selectedPlayerForDrawer}
          tournament={tournament}
        />
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  color: 'var(--color-text-secondary)',
  fontWeight: 600,
  fontSize: '0.78rem',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
};
