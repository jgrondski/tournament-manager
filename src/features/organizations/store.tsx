import React, { createContext, useContext, useState, useEffect } from 'react';
import { Organization } from '../tournament/types';
import { CreateOrganizationInput } from './types';

export const ORGANIZATIONS_STORAGE_KEY = 'classic_tetris_organizations';

export const DEFAULT_ORGANIZATIONS: Organization[] = [];

interface OrganizationContextType {
  organizations: Organization[];
  getOrganizationById: (id: string) => Organization | undefined;
  getOrganizationBySlug: (slug: string) => Organization | undefined;
  createOrganization: (input: CreateOrganizationInput) => Organization;
  updateOrganization: (id: string, updates: Partial<Organization>) => void;
  deleteOrganization: (id: string, hasAssociatedTournaments?: boolean) => { success: boolean; error?: string };
  orgError: string | null;
  clearOrgError: () => void;
}

const OrganizationContext = createContext<OrganizationContextType | null>(null);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organizations, setOrganizations] = useState<Organization[]>(DEFAULT_ORGANIZATIONS);
  const [orgError, setOrgError] = useState<string | null>(null);
  const clearOrgError = () => setOrgError(null);

  useEffect(() => {
    let isMounted = true;
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      fetch('/api/organizations')
        .then(res => {
          if (!res.ok) throw new Error('Failed to load organizations');
          return res.json();
        })
        .then(data => {
          if (isMounted && Array.isArray(data)) {
            setOrganizations(data);
          }
        })
        .catch(() => {
          if (isMounted) {
            setOrganizations([]);
          }
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
            setOrganizations(prev => [saved, ...prev.filter(o => o.id !== saved.id)]);
          }
        })
        .catch(err => {
          setOrgError(`Failed to create organization: ${err.message}`);
        });
    }

    return newOrg;
  };

  const updateOrganization = (id: string, updates: Partial<Organization>) => {
    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      fetch(`/api/organizations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(saved => {
          if (saved && saved.id) {
            setOrganizations(prev => prev.map(o => (o.id === id ? saved : o)));
          }
        })
        .catch(err => {
          setOrgError(`Failed to update organization: ${err.message}`);
        });
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

    if (typeof window !== 'undefined' && typeof fetch === 'function') {
      fetch(`/api/organizations/${id}`, {
        method: 'DELETE',
      })
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          setOrganizations(prev => prev.filter(o => o.id !== id));
        })
        .catch(err => {
          setOrgError(`Failed to delete organization: ${err.message}`);
        });
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
        orgError,
        clearOrgError,
      }}
    >
      {orgError && (
        <div
          role="alert"
          style={{
            backgroundColor: '#dc2626',
            color: '#ffffff',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 99999,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️</span>
            <span>{orgError}</span>
          </div>
          <button
            onClick={clearOrgError}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '16px',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
            title="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}
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
