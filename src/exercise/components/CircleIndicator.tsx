import { memo } from 'react'

const SIZE = 120
const BORDER = 3

export const CircleIndicator = memo(function CircleIndicator({
  progress,
  isInRange,
}: {
  progress: number
  isInRange: boolean
}) {
  const color = isInRange ? '#2f9e44' : '#e8590c'
  return (
    <div style={{
      width: SIZE,
      height: SIZE,
      borderRadius: '50%',
      border: `${BORDER}px solid ${color}`,
      position: 'relative',
      overflow: 'hidden',
      transition: 'border-color 150ms ease',
    }}>
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: `${progress * 100}%`,
        backgroundColor: color,
        opacity: 0.25,
        transition: 'background-color 150ms ease',
      }} />
    </div>
  )
})
