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
          fontSize: 24,
          background: '#213147',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '20%',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            position: 'relative',
          }}
        >
          {/* Outer Ring */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              border: '2px solid #E50000',
              borderRadius: '50%',
            }}
          />
          {/* Middle Ring */}
          <div
            style={{
              position: 'absolute',
              width: 12,
              height: 12,
              border: '1.5px solid #E50000',
              borderRadius: '50%',
            }}
          />
          {/* Center Dot */}
          <div
            style={{
              width: 4,
              height: 4,
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
