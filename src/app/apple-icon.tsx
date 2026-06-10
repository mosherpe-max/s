import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
  width: 180,
  height: 180,
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
          padding: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            color: 'white',
            fontWeight: 900,
            fontSize: 64,
            fontFamily: 'sans-serif',
            letterSpacing: '-0.07em',
          }}
        >
          <span>K</span>
          <span style={{ margin: '0 4px' }}>O</span>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              margin: '0 4px',
            }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="10.5" stroke="#E50000" strokeWidth="2.8" />
              <circle cx="12" cy="12" r="6" stroke="#E50000" strokeWidth="2.4" />
              <circle cx="12" cy="12" r="2.2" fill="#E50000" />
            </svg>
          </div>
          <span style={{ margin: '0 4px' }}>P</span>
        </div>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  );
}
