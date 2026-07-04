import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'IronLock — Rugpull-Proof Token Launchpad'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0a0b 0%, #111113 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Logo area */}
        <div style={{
          fontSize: 80,
          marginBottom: 20,
        }}>
          🔒
        </div>

        {/* Title */}
        <div style={{
          fontSize: 64,
          fontWeight: 'bold',
          color: '#ffffff',
          marginBottom: 16,
          letterSpacing: '-2px',
        }}>
          IronLock
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 28,
          color: '#9ca3af',
          marginBottom: 40,
          textAlign: 'center',
          maxWidth: 800,
        }}>
          Rugpull-Proof Token Launchpad on BNB Chain
        </div>

        {/* Features */}
        <div style={{
          display: 'flex',
          gap: 24,
          marginBottom: 40,
        }}>
          {[
            '🔒 LP Locked',
            '📅 Milestone Release',
            '🗳️ Refund Vote',
            '📈 Dev Vesting',
          ].map((feature) => (
            <div
              key={feature}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12,
                padding: '12px 20px',
                color: '#ffffff',
                fontSize: 18,
              }}
            >
              {feature}
            </div>
          ))}
        </div>

        {/* URL */}
        <div style={{
          fontSize: 24,
          color: '#6366f1',
          fontWeight: 'bold',
        }}>
          ironlock.xyz
        </div>
      </div>
    ),
    { ...size }
  )
}
