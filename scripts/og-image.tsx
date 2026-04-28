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
          top: 150,
          left: 0,
          width: 1200,
          display: "flex",
          justifyContent: "center",
          fontFamily: "EB Garamond",
          fontSize: 52,
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
          top: 230,
          left: 0,
          width: 1200,
          display: "flex",
          justifyContent: "center",
          fontFamily: "JetBrains Mono",
          fontSize: 14,
          color: GOLD_DIM,
          letterSpacing: 1.5,
        }}
      >
        liminal spaces & transitional states
      </div>

      {/* Accent line */}
      <div
        style={{
          position: "absolute",
          top: 280,
          left: 520,
          width: 160,
          height: 1,
          background: GOLD,
          opacity: 0.3,
          display: "flex",
        }}
      />

      {/* Backrooms thumbnail */}
      <Thumb left={120} width={240} bg="#141610" border="rgba(217,199,138,0.2)">
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
      <Thumb left={400} width={240} bg="#0a0d14" border="rgba(200,207,216,0.15)">
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
      <Thumb left={680} width={240} bg="#f4f1ea" border="rgba(0,0,0,0.1)">
        <div
          style={{
            position: "relative",
            width: 160,
            height: 80,
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
              width: 160,
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
              width: 160,
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
              fontSize: 36,
              color: "#1a1714",
              opacity: 0.7,
            }}
          >
            betwixt
          </div>
        </div>
      </Thumb>

      {/* Buffer thumbnail */}
      <Thumb left={960} width={200} bg="#f6f5f1" border="rgba(0,0,0,0.08)">
        <div
          style={{
            fontFamily: "EB Garamond",
            fontStyle: "italic",
            fontSize: 48,
            color: "#1a1a1a",
            opacity: 0.7,
          }}
        >
          almost
        </div>
      </Thumb>
    </div>
  );
}
