import { motion, AnimatePresence } from 'framer-motion';
import { useBoardStore } from '../store/boardStore';

export default function UserCursors() {
  const { activeUsers } = useBoardStore();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 200,
      }}
    >
      <AnimatePresence>
        {activeUsers.map((user) => (
          <motion.div
            key={user.id}
            animate={{ x: user.cursor.x, y: user.cursor.y }}
            transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 0.6 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              style={{ filter: `drop-shadow(0 1px 3px rgba(0,0,0,0.5))` }}
            >
              <path
                d="M4 0l13 10.279-5.661.951 3.516 7.165-2.924 1.41-3.539-7.22-4.392 3.806z"
                fill={user.color}
                stroke="rgba(0,0,0,0.3)"
                strokeWidth="0.5"
              />
            </svg>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                position: 'absolute',
                top: 18,
                left: 8,
                background: user.color,
                color: getContrastColor(user.color),
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                padding: '2px 6px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                letterSpacing: '0.01em',
              }}
            >
              {user.name}
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#000000' : '#FFFFFF';
}
