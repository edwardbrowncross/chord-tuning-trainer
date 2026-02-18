import { IconStar, IconStarFilled } from '@tabler/icons-react'
import { motion } from 'framer-motion'
import { Group } from '@mantine/core'

const starVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: (i: number) => ({
    scale: 1,
    opacity: 1,
    transition: {
      delay: 0.1 + i * 0.1,
      type: 'spring' as const,
      stiffness: 400,
      damping: 12,
    },
  }),
}

const particleBurst = {
  hidden: { scale: 0, opacity: 1 },
  visible: (i: number) => ({
    scale: [0, 1.8, 0],
    opacity: [1, 0.6, 0],
    transition: {
      delay: 0.1 + i * 0.1 + 0.05,
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  }),
}

export function StarReveal({ stars }: { stars: 1 | 2 | 3 }) {
  return (
    <Group gap={4}>
      {[0, 1, 2].map(i => {
        const earned = i < stars
        return (
          <div key={i} style={{ position: 'relative', width: 40, height: 40 }}>
            {earned && (
              <motion.div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={particleBurst}
              >
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(255,215,0,0.6) 0%, rgba(255,215,0,0) 70%)',
                }} />
              </motion.div>
            )}
            <motion.div
              custom={i}
              initial="hidden"
              animate="visible"
              variants={starVariants}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {earned
                ? <IconStarFilled size={40} color="gold" />
                : <IconStar size={40} color="gray" />
              }
            </motion.div>
          </div>
        )
      })}
    </Group>
  )
}
