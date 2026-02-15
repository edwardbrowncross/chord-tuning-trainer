const BAR_WIDTH = 280
const MARKER_WIDTH = 4
const MAX_DISPLAY_CENTS = 100

export function PitchIndicator({
  centsOff,
  thresholdCents,
}: {
  centsOff: number | null
  thresholdCents: number
}) {
  const thresholdWidthPct = (thresholdCents / MAX_DISPLAY_CENTS) * 100
  const markerPct = centsOff !== null
    ? 50 + (Math.max(-MAX_DISPLAY_CENTS, Math.min(MAX_DISPLAY_CENTS, centsOff)) / MAX_DISPLAY_CENTS) * 50
    : null
  const isInRange = centsOff !== null && Math.abs(centsOff) <= thresholdCents

  return (
    <div style={{ width: BAR_WIDTH, position: 'relative', height: 32 }}>
      {/* Background bar */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: '#e9ecef',
        borderRadius: 6,
      }} />

      {/* Threshold zone */}
      <div style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: `${50 - thresholdWidthPct}%`,
        width: `${thresholdWidthPct * 2}%`,
        backgroundColor: isInRange ? '#d3f9d8' : '#e8f5e9',
        borderRadius: 4,
      }} />

      {/* Center target line */}
      <div style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: '50%',
        width: 2,
        backgroundColor: '#868e96',
        transform: 'translateX(-50%)',
      }} />

      {/* Pitch marker */}
      {markerPct !== null && (
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${markerPct}%`,
          width: MARKER_WIDTH,
          backgroundColor: isInRange ? '#2f9e44' : '#e03131',
          borderRadius: 2,
          transform: 'translateX(-50%)',
          transition: 'left 50ms ease-out',
        }} />
      )}
    </div>
  )
}
