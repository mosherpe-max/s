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
            width: 100,
            height: 100,
            position: 'relative',
            marginBottom: '10px',
          }}
        >
          {/* Outer Ring */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              border: '14px solid #E50000',
              borderRadius: '50%',
            }}
          />
          {/* Middle Ring */}
          <div
            style={{
              position: 'absolute',
              width: 55,
              height: 55,
              border: '10px solid #E50000',
              borderRadius: '50%',
            }}
          />
          {/* Center Dot */}
          <div
            style={{
              width: 18,
              height: 18,
              background: '#E50000',
              borderRadius: '50%',
            }}
          />
        </div>
        <div 
          style={{ 
            color: 'white', 
            fontSize: 38, 
            fontWeight: 900, 
            letterSpacing: '-0.05em',
            fontFamily: 'sans-serif'
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
