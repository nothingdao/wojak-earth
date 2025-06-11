// src/components/StaticEffect.tsx
type StaticType = 'none' | 'static' | 'scanlines' | 'flicker' | 'all'

interface StaticEffectProps {
  type?: StaticType
  opacity?: number
}

export function StaticEffect({ type = 'none', opacity = 0.5 }: StaticEffectProps) {
  if (type === 'none') return null

  return (
    <>
      {/* Static dots effect */}
      {(type === 'static' || type === 'all') && (
        <div
          className="fixed inset-0 pointer-events-none z-[1]"
          style={{
            opacity: opacity,
            background: `
              radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px),
              radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px, 40px 40px',
            animation: 'staticMove 0.1s infinite'
          }}
        />
      )}

      {/* Scan lines effect */}
      {(type === 'scanlines' || type === 'all') && (
        <div
          className="fixed inset-0 pointer-events-none z-[2]"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 255, 0, 0.03) 2px,
              rgba(0, 255, 0, 0.03) 4px
            )`,
            animation: 'scan 0.1s linear infinite'
          }}
        />
      )}

      {/* Flicker effect */}
      {(type === 'flicker' || type === 'all') && (
        <div
          className="fixed inset-0 pointer-events-none z-[3]"
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            animation: 'flicker 0.15s infinite'
          }}
        />
      )}

      {/* Inject keyframes */}
      <style jsx>{`
        @keyframes staticMove {
          0% { 
            background-position: 0 0, 10px 10px;
            filter: brightness(1);
          }
          25% { 
            background-position: 5px 0, 15px 5px;
            filter: brightness(1.2);
          }
          50% { 
            background-position: 10px 5px, 0 15px;
            filter: brightness(0.8);
          }
          75% { 
            background-position: 15px 10px, 5px 0;
            filter: brightness(1.1);
          }
          100% { 
            background-position: 0 0, 10px 10px;
            filter: brightness(1);
          }
        }

        @keyframes scan {
          0% { transform: translateY(0px); }
          100% { transform: translateY(4px); }
        }

        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </>
  )
}
