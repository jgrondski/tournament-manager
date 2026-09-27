import React from 'react';
import { Send } from 'lucide-react';
import { QualFormat, PointsThreshold } from '../../tournament/types';
import { QualFormatEditor } from '../../tournament/components/QualFormatEditor';

interface OrgSettingsTabProps {
  orgName: string;
  qualFormat: QualFormat;
  qualAverageCount?: number;
  pointsConfig: PointsThreshold[];
  bestOf: number;
  discordWebhookUrl: string;
  webhookTestStatus: string | null;
  onQualFormatChange: (format: QualFormat) => void;
  onAverageCountChange: (count: number | undefined) => void;
  onPointsConfigChange: (config: PointsThreshold[]) => void;
  onBestOfChange: (bestOf: number) => void;
  onDiscordWebhookUrlChange: (url: string) => void;
  onTestWebhook: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const OrgSettingsTab: React.FC<OrgSettingsTabProps> = ({
  orgName,
  qualFormat,
  qualAverageCount,
  pointsConfig,
  bestOf,
  discordWebhookUrl,
  webhookTestStatus,
  onQualFormatChange,
  onAverageCountChange,
  onPointsConfigChange,
  onBestOfChange,
  onDiscordWebhookUrlChange,
  onTestWebhook,
  onSubmit,
}) => {
  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div style={{ background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.25rem' }}>
            Default Tournament Rules
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
            New tournaments hosted under {orgName} will automatically inherit these qualifying and match play rules.
          </p>
        </div>

        <QualFormatEditor
          qualFormat={qualFormat}
          qualAverageCount={qualAverageCount}
          pointsConfig={pointsConfig}
          onFormatChange={onQualFormatChange}
          onAverageCountChange={onAverageCountChange}
          onPointsConfigChange={onPointsConfigChange}
        />

        <div style={{ maxWidth: '300px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.35rem' }}>
            Default Bracket Best-of Match
          </label>
          <select
            value={bestOf}
            onChange={e => onBestOfChange(parseInt(e.target.value, 10) || 5)}
            style={{
              width: '100%',
              padding: '0.65rem 0.85rem',
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: '#ffffff',
              fontSize: '0.875rem',
            }}
          >
            <option value={3}>Best of 3</option>
            <option value={5}>Best of 5</option>
            <option value={7}>Best of 7</option>
          </select>
        </div>
      </div>

      {/* Discord Webhook Groundwork */}
      <div style={{ background: 'var(--color-bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Circuit Discord Webhook</span>
              <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontWeight: 600 }}>
                Groundwork
              </span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
              Announcements, tournament registrations, and championship alerts can dispatch to your organization's Discord channel.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <input
            type="text"
            placeholder="https://discord.com/api/webhooks/..."
            value={discordWebhookUrl}
            onChange={e => onDiscordWebhookUrlChange(e.target.value)}
            style={{
              flex: 1,
              padding: '0.65rem 0.85rem',
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: '#ffffff',
              fontSize: '0.875rem',
            }}
          />
          <button
            type="button"
            onClick={onTestWebhook}
            className="btn btn-secondary"
            style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', display: 'inline-flex', gap: '0.4rem', whiteSpace: 'nowrap' }}
          >
            <Send size={14} />
            <span>Test Ping</span>
          </button>
        </div>

        {webhookTestStatus && (
          <div style={{ fontSize: '0.8rem', color: webhookTestStatus.startsWith('✅') ? '#34d399' : '#f87171', fontWeight: 600 }}>
            {webhookTestStatus}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ padding: '0.65rem 1.75rem', fontSize: '0.92rem' }}
        >
          Save Default Rules &amp; Webhook
        </button>
      </div>
    </form>
  );
};
