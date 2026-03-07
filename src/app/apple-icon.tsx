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
          alignItems: 'center',
          justifyContent: 'center',
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
          }}
        >
          {/* Outer Ring */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              border: '10px solid #E50000',
              borderRadius: '50%',
            }}
          />
          {/* Middle Ring */}
          <div
            style={{
              position: 'absolute',
              width: 70,
              height: 70,
              border: '8px solid #E50000',
              borderRadius: '50%',
            }}
          />
          {/* Center Dot */}
          <div
            style={{
              width: 24,
              height: 24,
              background: '#E50000',
              borderRadius: '50%',
            }}
          />
        </div>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  );
}
