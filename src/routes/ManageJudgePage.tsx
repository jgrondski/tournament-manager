import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTournament } from '../features/tournament/store';
import { getStoredTierSlug, setStoredTierSlug } from '../features/tournament/tierStorage';
import { TournamentLayout } from '../components/TournamentLayout';
import { MatchCardFeed } from '../features/bracket/components/MatchCardFeed';
import { getContrastingTextColor } from '../features/bracket/colorUtils';
import { GitBranch } from 'lucide-react';

export const ManageJudgePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getTournamentBySlug } = useTournament();

  const tournament = slug ? getTournamentBySlug(slug) : undefined;
  if (!tournament) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
        <h2>Tournament Not Found</h2>
        <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Back to Tournaments
        </button>
      </div>
    );
  }

  const sortedTiers = [...tournament.tiers].sort((a, b) => a.priority - b.priority);
  const storedTier = getStoredTierSlug(slug);
  const requestedTierSlug = searchParams.get('tier') || storedTier || sortedTiers[0]?.slug;
  const tier = sortedTiers.find(t => t.slug === requestedTierSlug || t.id === requestedTierSlug) || sortedTiers[0];

  useEffect(() => {
    if (tier && slug) {
      setStoredTierSlug(slug, tier.slug);
      if (searchParams.get('tier') !== tier.slug) {
        setSearchParams({ tier: tier.slug }, { replace: true });
      }
    }
  }, [tier?.slug, slug]);

  if (!tier) {
    return (
      <TournamentLayout tournament={tournament} activeView="judge">
        <main style={{ flex: 1, padding: '3rem 1.5rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <h2 style={{ color: 'var(--color-text-primary)', fontSize: '1.4rem' }}>No Bracket Tiers Configured</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Floor Judge requires at least one bracket tier to manage matches. Once bracket tiers are configured, matches will appear here for scoring.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={() => navigate(`/${tournament.slug}/leaderboard`)} className="btn btn-secondary">
              🏆 View Qualifiers
            </button>
            <button onClick={() => navigate(`/${tournament.slug}/manage/settings`)} className="btn btn-primary">
              ⚙️ Configure Tiers in Settings
            </button>
          </div>
        </main>
      </TournamentLayout>
    );
  }

  return (
    <TournamentLayout
      tournament={tournament}
      activeTier={tier}
      activeView="judge"
    >
      {/* In-Page Tier Selector Bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          padding: '0.65rem 1.25rem',
          background: 'var(--color-bg-surface)',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Tier:
          </span>
          {sortedTiers.map(t => {
            const isActive = t.id === tier.id;
            const tierColor = t.primaryColor || '#f59e0b';
            const contrastColor = getContrastingTextColor(tierColor);

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setStoredTierSlug(slug, t.slug);
                  setSearchParams({ tier: t.slug });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.35rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.78rem',
                  fontWeight: isActive ? 800 : 600,
                  background: isActive ? tierColor : 'var(--color-bg-base)',
                  color: isActive ? contrastColor : 'var(--color-text-secondary)',
                  border: isActive ? `1px solid ${tierColor}` : '1px solid var(--color-border)',
                  cursor: isActive ? 'default' : 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? `0 0 10px ${tierColor}40` : 'none',
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: isActive ? contrastColor : tierColor,
                    display: 'inline-block',
                  }}
                />
                <span>{t.name}</span>
                <span style={{ fontSize: '0.7rem', opacity: isActive ? 0.9 : 0.7, fontWeight: 500 }}>
                  ({t.playerCount})
                </span>
              </button>
            );
          })}
        </div>

        <Link
          to={`/${tournament.slug}/${tier.slug}`}
          className="btn btn-secondary"
          style={{
            padding: '0.35rem 0.75rem',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--color-text-secondary)',
          }}
          title="Open Visual Bracket for this Tier"
        >
          <GitBranch size={13} />
          <span>View Bracket</span>
        </Link>
      </div>

      <main style={{ flex: 1, padding: '1rem 0' }}>
        <MatchCardFeed
          tournament={tournament}
          tier={tier}
        />
      </main>
    </TournamentLayout>
  );
};
