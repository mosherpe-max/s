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
          padding: '2px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            position: 'relative',
            marginTop: '2px',
          }}
        >
          {/* Outer Ring */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              border: '3px solid #E50000',
              borderRadius: '50%',
            }}
          />
          {/* Middle Ring */}
          <div
            style={{
              position: 'absolute',
              width: 10,
              height: 10,
              border: '2px solid #E50000',
              borderRadius: '50%',
            }}
          />
          {/* Center Dot */}
          <div
            style={{
              width: 3,
              height: 3,
              background: '#E50000',
              borderRadius: '50%',
            }}
          />
        </div>
        <div 
          style={{ 
            color: 'white', 
            fontSize: 8, 
            fontWeight: 900, 
            marginTop: '1px',
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
