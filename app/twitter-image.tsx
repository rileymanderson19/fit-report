import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'FitReport - Client fulfillment that used to take hours, done in minutes';
export const size = { width: 1200, height: 600 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #EFF6FF 0%, #FFFFFF 50%, #F9FAFB 100%)',
          padding: '50px 80px',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '36px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: '#2563EB',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
              padding: '9px',
              gap: '4px',
            }}
          >
            <div style={{ width: '26px', height: '4px', borderRadius: '2px', background: 'white', display: 'flex' }} />
            <div style={{ width: '18px', height: '4px', borderRadius: '2px', background: 'white', display: 'flex' }} />
            <div style={{ width: '12px', height: '4px', borderRadius: '2px', background: 'white', display: 'flex' }} />
          </div>
          <div style={{ display: 'flex', fontSize: '30px', fontWeight: 700 }}>
            <span style={{ color: '#2563EB' }}>Fit</span>
            <span style={{ color: '#111827' }}>Report</span>
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '6px',
          }}
        >
          <div
            style={{
              fontSize: '50px',
              fontWeight: 800,
              color: '#111827',
              lineHeight: 1.15,
              letterSpacing: '-1px',
              display: 'flex',
            }}
          >
            Client Fulfillment That Used to
          </div>
          <div
            style={{
              fontSize: '50px',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-1px',
              display: 'flex',
            }}
          >
            <span style={{ color: '#111827' }}>Take Hours,&nbsp;</span>
            <span style={{ color: '#2563EB' }}>Done in Minutes</span>
          </div>
        </div>

        {/* Subheadline */}
        <div
          style={{
            fontSize: '22px',
            color: '#6B7280',
            textAlign: 'center',
            marginTop: '20px',
            maxWidth: '780px',
            lineHeight: 1.5,
            display: 'flex',
          }}
        >
          Auto-generate branded progress reports from your Trainerize data.
        </div>

        {/* CTA pill */}
        <div
          style={{
            marginTop: '36px',
            background: '#2563EB',
            color: 'white',
            fontSize: '18px',
            fontWeight: 600,
            padding: '12px 32px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          Schedule a Call →
        </div>

        {/* Domain */}
        <div
          style={{
            position: 'absolute',
            bottom: '26px',
            fontSize: '16px',
            color: '#9CA3AF',
            display: 'flex',
          }}
        >
          fitreport.co
        </div>
      </div>
    ),
    { ...size }
  );
}
