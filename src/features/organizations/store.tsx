import React, { createContext, useContext, useState, useEffect } from 'react';
import { Organization } from '../tournament/types';
import { CreateOrganizationInput } from './types';

export const ORGANIZATIONS_STORAGE_KEY = 'classic_tetris_organizations';

export const DEFAULT_ORGANIZATIONS: Organization[] = [
  {
    id: 'org_ctwc',
    slug: 'ctwc',
    name: 'Classic Tetris World Championship',
    shortName: 'CTWC',
    description: 'The premier global esports tournament for Classic NES Tetris, featuring world-class masters and regional qualifier circuits.',
    website: 'https://tetrischampionship.com',
    brandColor: '#ffc905',
    themeColors: {
      primaryColor: '#ffc905',
      secondaryColor: '#705b33',
      cardColor: '#1b1c1d',
      textColor: '#94A3B8',
      backgroundColor: '#020203',
    },
    tierThemes: [
      {
        id: 'theme_ctwc_silver',
        name: 'Silver',
        themeColors: {
          primaryColor: '#CBD5E1',
          secondaryColor: '#3d4652',
          cardColor: '#0E1420',
          textColor: '#4f5c6d',
          backgroundColor: '#0B0E14',
        },
      },
      {
        id: 'theme_ctwc_bronze',
        name: 'Bronze',
        themeColors: {
          primaryColor: '#db5f00',
          secondaryColor: '#4e310e',
          cardColor: '#181410',
          textColor: '#5e6f87',
          backgroundColor: '#0B0E14',
        },
      },
    ],
    branding: {
      themeColors: {
        primaryColor: '#ffc905',
        secondaryColor: '#705b33',
        cardColor: '#1b1c1d',
        textColor: '#94A3B8',
        backgroundColor: '#020203',
      },
      brandColor: '#ffc905',
    },
    defaultRules: {
      qualFormat: 'AVERAGE_OF_X',
      qualAverageCount: 2,
      qualWindowMinutes: 120,
      bestOf: 5,
      primaryColor: '#ffc905',
      secondaryColor: '#705b33',
    },
    createdAt: 1710000000000,
  },
  {
    id: 'org_ctm',
    slug: 'ctm',
    name: 'Classic Tetris Monthly',
    shortName: 'CTM',
    description: 'The world’s largest online monthly tournament series for Classic Tetris, uniting players across all skill tiers.',
    website: 'https://discord.gg/ctm',
    brandColor: '#38bdf8',
    themeColors: {
      primaryColor: '#38bdf8',
      secondaryColor: '#0369a1',
      cardColor: '#0c1929',
      textColor: '#cbd5e1',
      backgroundColor: '#030712',
    },
    tierThemes: [
      {
        id: 'theme_ctm_masters',
        name: 'Primary Tier (Masters)',
        themeColors: {
          primaryColor: '#38bdf8',
          secondaryColor: '#0369a1',
          cardColor: '#0c1929',
          textColor: '#cbd5e1',
          backgroundColor: '#030712',
        },
      },
      {
        id: 'theme_ctm_challengers',
        name: 'Secondary Tier (Challengers)',
        themeColors: {
          primaryColor: '#a855f7',
          secondaryColor: '#6b21a8',
          cardColor: '#180d24',
          textColor: '#e9d5ff',
          backgroundColor: '#0a0512',
        },
      },
    ],
    branding: {
      themeColors: {
        primaryColor: '#38bdf8',
        secondaryColor: '#0369a1',
        cardColor: '#0c1929',
        textColor: '#cbd5e1',
        backgroundColor: '#030712',
      },
      brandColor: '#38bdf8',
    },
    defaultRules: {
      qualFormat: 'AVERAGE_OF_X',
      qualAverageCount: 3,
      qualWindowMinutes: 120,
      bestOf: 5,
      primaryColor: '#38bdf8',
      secondaryColor: '#0369a1',
    },
    createdAt: 1710500000000,
  },
];

interface OrganizationContextType {
  organizations: Organization[];
  getOrganizationById: (id: string) => Organization | undefined;
  getOrganizationBySlug: (slug: string) => Organization | undefined;
  createOrganization: (input: CreateOrganizationInput) => Organization;
  updateOrganization: (id: string, updates: Partial<Organization>) => void;
  deleteOrganization: (id: string, hasAssociatedTournaments?: boolean) => { success: boolean; error?: string };
}

const OrganizationContext = createContext<OrganizationContextType | null>(null);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>(DEFAULT_ORGANIZATIONS);

  useEffect(() => {
    let isMounted = true;
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      fetch('/api/organizations')
        .then(res => {
          if (!res.ok) throw new Error('Failed to load organizations');
          return res.json();
        })
        .then(data => {
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setOrganizations(data);
          }
        })
        .catch(() => {
          // Gracefully fallback to DEFAULT_ORGANIZATIONS
        });
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const getOrganizationById = (id: string) => {
    return organizations.find(o => o.id === id);
  };

  const getOrganizationBySlug = (slug: string) => {
    return organizations.find(o => o.slug === slug || o.id === slug);
  };

  const createOrganization = (input: CreateOrganizationInput): Organization => {
    const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    const theme = input.themeColors || input.branding?.themeColors || {
      primaryColor: input.brandColor || '#ffc905',
      secondaryColor: '#705b33',
      cardColor: '#1b1c1d',
      textColor: '#94A3B8',
      backgroundColor: '#020203',
    };
    const shortName = input.shortName || input.name;
    const tierThemes = input.tierThemes && input.tierThemes.length > 0 ? input.tierThemes : [
      {
        id: `theme_${Date.now()}_primary`,
        name: 'Primary Tier',
        themeColors: theme,
      },
    ];
    const newOrg: Organization = {
      ...input,
      id: `org_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      slug: slug || `org-${Date.now()}`,
      shortName,
      brandColor: input.brandColor || theme.primaryColor,
      themeColors: theme,
      tierThemes,
      branding: {
        logoUrl: input.logoUrl || input.branding?.logoUrl,
        bannerUrl: input.bannerUrl || input.branding?.bannerUrl,
        themeColors: theme,
        brandColor: input.brandColor || theme.primaryColor,
      },
      createdAt: Date.now(),
    };

    setOrganizations(prev => [newOrg, ...prev]);

    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrg),
      })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(saved => {
          if (saved && saved.id) {
            setOrganizations(prev => prev.map(o => (o.id === newOrg.id ? saved : o)));
          }
        })
        .catch(err => console.error('Failed to persist organization to API:', err));
    }

    return newOrg;
  };

  const updateOrganization = (id: string, updates: Partial<Organization>) => {
    setOrganizations(prev =>
      prev.map(o => {
        if (o.id !== id) return o;
        const updatedTheme = updates.themeColors || updates.branding?.themeColors || o.themeColors;
        return {
          ...o,
          ...updates,
          themeColors: updatedTheme,
          tierThemes: updates.tierThemes || o.tierThemes,
          branding: {
            ...o.branding,
            ...updates.branding,
            logoUrl: updates.logoUrl !== undefined ? updates.logoUrl : (updates.branding?.logoUrl !== undefined ? updates.branding.logoUrl : o.logoUrl),
            bannerUrl: updates.bannerUrl !== undefined ? updates.bannerUrl : (updates.branding?.bannerUrl !== undefined ? updates.branding.bannerUrl : o.bannerUrl),
            themeColors: updatedTheme,
            brandColor: updates.brandColor || updatedTheme?.primaryColor || o.brandColor,
          },
          // If slug is updated, normalize
          slug: updates.slug ? updates.slug.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-') : o.slug,
        };
      })
    );

    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      fetch(`/api/organizations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }).catch(err => console.error('Failed to update organization in API:', err));
    }
  };

  const deleteOrganization = (
    id: string,
    hasAssociatedTournaments?: boolean
  ): { success: boolean; error?: string } => {
    if (hasAssociatedTournaments) {
      return {
        success: false,
        error: 'Cannot delete organization while active tournaments belong to it. Please delete or reassign them first.',
      };
    }

    setOrganizations(prev => prev.filter(o => o.id !== id));

    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      fetch(`/api/organizations/${id}`, {
        method: 'DELETE',
      }).catch(err => console.error('Failed to delete organization from API:', err));
    }

    return { success: true };
  };

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        getOrganizationById,
        getOrganizationBySlug,
        createOrganization,
        updateOrganization,
        deleteOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = (): OrganizationContextType => {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return ctx;
};
