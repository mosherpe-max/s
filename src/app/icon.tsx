import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          background: '#213147',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '20%',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ marginBottom: '1px' }}
          >
            <circle cx="12" cy="12" r="10.5" stroke="#E50000" strokeWidth="2.8" />
            <circle cx="12" cy="12" r="6" stroke="#E50000" strokeWidth="2.4" />
            <circle cx="12" cy="12" r="2.2" fill="#E50000" />
          </svg>
          <div style={{
            color: 'white',
            fontSize: '6px',
            fontWeight: 900,
            letterSpacing: '0.05em'
          }}>
            KOOP
          </div>
        </div>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  );
}
