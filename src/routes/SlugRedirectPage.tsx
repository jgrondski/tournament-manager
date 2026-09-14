import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournament } from '../features/tournament/store';

export const SlugRedirectPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { getTournamentBySlug } = useTournament();

  useEffect(() => {
    if (!slug) {
      navigate('/', { replace: true });
      return;
    }
    const tournament = getTournamentBySlug(slug);
    if (!tournament) {
      navigate('/', { replace: true });
      return;
    }
    if (tournament.tiers.length === 0) {
      navigate(`/${slug}/leaderboard`, { replace: true });
      return;
    }
    const highestPriorityTier = [...tournament.tiers].sort((a, b) => a.priority - b.priority)[0];
    const defaultTierSlug = highestPriorityTier.slug;
    navigate(`/${slug}/${defaultTierSlug}`, { replace: true });
  }, [slug, navigate, getTournamentBySlug]);

  return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
      Loading tournament...
    </div>
  );
};
