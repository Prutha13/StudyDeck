import { motion } from 'framer-motion';

/**
 * AmbientBackground
 * Fixed, full-screen ambient glow layer that sits behind glassmorphic panels
 * and casts soft moving color into their frosted blur. Purely decorative —
 * pointer-events are disabled and it never affects layout.
 */
const orbs = [
  {
    id: 'amber',
    className: 'top-[-10%] right-[-8%] w-96 h-96 bg-amber-500/15 blur-[130px]',
    animate: {
      x: [0, 40, -20, 0],
      y: [0, -30, 15, 0],
      scale: [1, 1.12, 0.96, 1]
    },
    duration: 20
  },
  {
    id: 'indigo',
    className: 'bottom-[-15%] left-[-10%] w-[450px] h-[450px] bg-indigo-600/15 blur-[150px]',
    animate: {
      x: [0, -35, 25, 0],
      y: [0, 25, -20, 0],
      scale: [1, 0.92, 1.1, 1]
    },
    duration: 24
  },
  {
    id: 'cyan',
    className:
      'top-[40%] left-[45%] -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/10 blur-[120px]',
    animate: {
      x: [0, 25, -30, 0],
      y: [0, -20, 20, 0],
      scale: [1, 1.08, 0.94, 1]
    },
    duration: 17
  }
];

export default function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {orbs.map((orb) => (
        <motion.div
          key={orb.id}
          className={`absolute rounded-full ${orb.className}`}
          animate={orb.animate}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      ))}
      {/* Faint top vignette so panels read crisply against the canvas in dark mode */}
      <div className="absolute inset-0 dark:bg-gradient-to-b dark:from-[#080b11]/40 dark:via-transparent dark:to-[#080b11]/60 bg-gradient-to-b from-amber-100/20 via-transparent to-slate-200/30" />
    </div>
  );
}
