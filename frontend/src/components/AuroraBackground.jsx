import React, { useEffect } from 'react';
import { motion, useMotionValue, animate, useMotionTemplate } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';

const COLORS = ['#13FFAA', '#1E67C6', '#CE84CF', '#DD335C'];

const AuroraBackground = () => {
  const color = useMotionValue(COLORS[0]);

  useEffect(() => {
    const controls = animate(color, COLORS, {
      ease: 'easeInOut',
      duration: 10,
      repeat: Infinity,
      repeatType: 'mirror',
    });
    return () => controls.stop();
  }, []);

  const backgroundImage = useMotionTemplate`radial-gradient(125% 125% at 50% 0%, #020617 50%, ${color})`;

  return (
    <motion.div
      style={{
        backgroundImage,
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        style={{ position: 'absolute', inset: 0 }}
        camera={{ position: [0, 0, 1] }}
      >
        <Stars radius={50} count={2500} factor={4} fade speed={2} />
      </Canvas>
    </motion.div>
  );
};

export default AuroraBackground;
