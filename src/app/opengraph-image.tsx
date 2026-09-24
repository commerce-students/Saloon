import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

import { clinic, clinicLocationLine } from '@/config/clinic';

/**
 * Open Graph / social preview image, rendered at build time.
 *
 * The same typefaces as the site are embedded so a shared link looks like the
 * brand rather than a generic preview. Replace with approved clinic photography
 * later if preferred (drop `opengraph-image.jpg` next to this file).
 */
export const alt = `${clinic.name} — appointment booking, ${clinicLocationLine}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const fontsDir = join(process.cwd(), 'src/app/fonts');
  const [serif, sans] = await Promise.all([
    readFile(join(fontsDir, 'cormorant-garamond-500.ttf')),
    readFile(join(fontsDir, 'jost-400.ttf')),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#fcfaf7',
        padding: '72px 80px',
        position: 'relative',
      }}
    >
      {/* Quiet graphic anchors: a nude panel and a hairline rule. */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: 320,
          height: '100%',
          backgroundColor: '#efe6dd',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 320,
          width: 1,
          height: '100%',
          backgroundColor: '#d4c8bc',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          style={{
            width: 54,
            height: 54,
            border: '1px solid #d4c8bc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Cormorant',
            fontSize: 24,
            color: '#7a5557',
          }}
        >
          CS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Jost',
              fontSize: 17,
              letterSpacing: 6,
              color: '#23201e',
              textTransform: 'uppercase',
            }}
          >
            Chic by Sisters
          </div>
          <div
            style={{
              display: 'flex',
              fontFamily: 'Jost',
              fontSize: 13,
              letterSpacing: 7,
              color: '#6e6862',
              textTransform: 'uppercase',
            }}
          >
            Clinic · Muscat
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 780 }}>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Cormorant',
            fontSize: 88,
            lineHeight: 1.05,
            color: '#23201e',
          }}
        >
          Your Time, Your Appointment.
        </div>
        <div
          style={{
            display: 'flex',
            fontFamily: 'Jost',
            fontSize: 26,
            color: '#55504b',
            lineHeight: 1.5,
          }}
        >
          Book online at Chic by Sisters Clinic, {clinicLocationLine}.
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          fontFamily: 'Jost',
          fontSize: 17,
          letterSpacing: 3,
          color: '#6e6862',
          textTransform: 'uppercase',
        }}
      >
        <div style={{ display: 'flex' }}>Appointments · Treatments · Location</div>
        <div style={{ display: 'flex' }}>{clinic.city}</div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Cormorant', data: serif, weight: 500, style: 'normal' },
        { name: 'Jost', data: sans, weight: 400, style: 'normal' },
      ],
    },
  );
}
