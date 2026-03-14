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
            justifyContent: 'center',
            width: 120,
            height: 120,
            position: 'relative',
            marginBottom: '10px',
          }}
        >
          {/* Target Symbol Replacement for character 3 in KOOP */}
          <svg
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="10" stroke="#FF0000" strokeWidth="3" />
            <circle cx="12" cy="12" r="5" stroke="#FF0000" strokeWidth="3" />
            <circle cx="12" cy="12" r="2" fill="#FF0000" />
          </svg>
        </div>
        <div 
          style={{ 
            color: 'white', 
            fontSize: 32, 
            fontWeight: 900, 
            letterSpacing: '-0.05em',
            fontFamily: 'sans-serif',
            marginTop: '5px'
          }}
        >
          KOOP
        </div>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  );
}
