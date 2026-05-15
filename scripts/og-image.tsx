/** @jsxRuntime automatic */
/** @jsxImportSource react */

// JSX layout for the design-experiments OG image. Mirrors the existing
// og-image.svg: dark background, faint grid, gold title + subtitle,
// horizontal accent rule, and four mini-thumbnails representing each
// of the liminal-space concepts (Backrooms, 3:47 AM, Betwixt, Buffer).

const GOLD = "#d9c78a";
const GOLD_BRIGHT = "#e8dba8";
const GOLD_DIM = "rgba(217,199,138,0.55)";
const BG = "#0d0f0a";

function GridLines() {
  const horizontal = [157, 315, 473];
  const vertical = [300, 600, 900];
  return (
    <>
      {horizontal.map((y) => (
        <div
          key={`h-${y}`}
          style={{
            position: "absolute",
            top: y,
            left: 0,
            width: 1200,
            height: 1,
            background: "rgba(217,199,138,0.06)",
            display: "flex",
          }}
        />
      ))}
      {vertical.map((x) => (
        <div
          key={`v-${x}`}
          style={{
            position: "absolute",
            top: 0,
            left: x,
            width: 1,
            height: 630,
            background: "rgba(217,199,138,0.06)",
            display: "flex",
          }}
        />
      ))}
    </>
  );
}

interface ThumbProps {
  left: number;
  width: number;
  bg: string;
  border: string;
  children: React.ReactNode;
}

function Thumb({ left, width, bg, border, children }: ThumbProps) {
  return (
    <div
      style={{
        position: "absolute",
        top: 380,
        left,
        width,
        height: 160,
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

// 5 thumbs at 184px wide, 20px gutter, leaving symmetric 60px margins
// in a 1200px canvas. (5 * 184 + 4 * 20 + 2 * 60 = 1200)
const THUMB_W = 184;
const THUMB_GUTTER = 20;
const THUMB_LEFT_0 = 60;
const thumbLeft = (i: number) => THUMB_LEFT_0 + i * (THUMB_W + THUMB_GUTTER);

export function OgImage() {
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        position: "relative",
        background: BG,
        display: "flex",
        fontFamily: "EB Garamond",
      }}
    >
      <GridLines />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 122,
          left: 0,
          width: 1200,
          display: "flex",
          justifyContent: "center",
          fontFamily: "EB Garamond",
          fontSize: 76,
          color: GOLD_BRIGHT,
          letterSpacing: -0.5,
        }}
      >
        Design Experiments
      </div>

      {/* Subtitle */}
      <div
        style={{
          position: "absolute",
          top: 232,
          left: 0,
          width: 1200,
          display: "flex",
          justifyContent: "center",
          fontFamily: "JetBrains Mono",
          fontSize: 30,
          color: GOLD_DIM,
          letterSpacing: 2,
        }}
      >
        single-page studies in interactive design
      </div>

      {/* Accent line */}
      <div
        style={{
          position: "absolute",
          top: 308,
          left: 520,
          width: 160,
          height: 1,
          background: GOLD,
          opacity: 0.3,
          display: "flex",
        }}
      />

      {/* Backrooms thumbnail */}
      <Thumb left={thumbLeft(0)} width={THUMB_W} bg="#141610" border="rgba(217,199,138,0.2)">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 80,
              height: 60,
              border: `1.5px solid ${GOLD}`,
              opacity: 0.5,
              display: "flex",
            }}
          />
          <div
            style={{
              fontFamily: "EB Garamond",
              fontStyle: "italic",
              fontSize: 16,
              color: GOLD,
              opacity: 0.7,
            }}
          >
            field archive
          </div>
        </div>
      </Thumb>

      {/* 3:47 AM thumbnail */}
      <Thumb left={thumbLeft(1)} width={THUMB_W} bg="#0a0d14" border="rgba(200,207,216,0.15)">
        <div
          style={{
            fontFamily: "JetBrains Mono",
            fontWeight: 400,
            fontSize: 52,
            color: "#e8ecf0",
            opacity: 0.8,
          }}
        >
          03:47
        </div>
      </Thumb>

      {/* Betwixt thumbnail */}
      <Thumb left={thumbLeft(2)} width={THUMB_W} bg="#f4f1ea" border="rgba(0,0,0,0.1)">
        <div
          style={{
            position: "relative",
            width: 140,
            height: 70,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 140,
              height: 1.5,
              background: "#1a1714",
              opacity: 0.5,
              display: "flex",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: 140,
              height: 1.5,
              background: "#1a1714",
              opacity: 0.5,
              display: "flex",
            }}
          />
          <div
            style={{
              fontFamily: "EB Garamond",
              fontStyle: "italic",
              fontSize: 32,
              color: "#1a1714",
              opacity: 0.7,
            }}
          >
            betwixt
          </div>
        </div>
      </Thumb>

      {/* Buffer thumbnail */}
      <Thumb left={thumbLeft(3)} width={THUMB_W} bg="#f6f5f1" border="rgba(0,0,0,0.08)">
        <div
          style={{
            fontFamily: "EB Garamond",
            fontStyle: "italic",
            fontSize: 40,
            color: "#1a1a1a",
            opacity: 0.7,
          }}
        >
          almost
        </div>
      </Thumb>

      {/* FlowCal thumbnail */}
      <Thumb left={thumbLeft(4)} width={THUMB_W} bg="#fbf8f0" border="rgba(0,0,0,0.08)">
        <div
          style={{
            position: "relative",
            width: 144,
            height: 84,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* soft category bands forming the daily flow */}
          <div style={{ position: "absolute", top: 28, left: 0,   width: 34, height: 28, background: "#90a8d0", opacity: 0.75, borderRadius: 2, display: "flex" }} />
          <div style={{ position: "absolute", top: 28, left: 34,  width: 22, height: 28, background: "#a3d0d5", opacity: 0.75, borderRadius: 2, display: "flex" }} />
          <div style={{ position: "absolute", top: 28, left: 56,  width: 26, height: 28, background: "#e8cf95", opacity: 0.85, borderRadius: 2, display: "flex" }} />
          <div style={{ position: "absolute", top: 28, left: 82,  width: 24, height: 28, background: "#c8b5d8", opacity: 0.75, borderRadius: 2, display: "flex" }} />
          <div style={{ position: "absolute", top: 28, left: 106, width: 38, height: 28, background: "#a8d4a3", opacity: 0.75, borderRadius: 2, display: "flex" }} />
          {/* "now" tick */}
          <div style={{ position: "absolute", top: 18, left: 70, width: 2, height: 48, background: "#2b2620", opacity: 0.85, display: "flex" }} />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 144,
              fontFamily: "EB Garamond",
              fontStyle: "italic",
              fontSize: 16,
              color: "#2b2620",
              opacity: 0.75,
              display: "flex",
              justifyContent: "center",
            }}
          >
            around now
          </div>
        </div>
      </Thumb>
    </div>
  );
}
