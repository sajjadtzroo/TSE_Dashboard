import { motion } from "motion/react";

export default function Reveal({ children, delay = 0, direction = "up" }) {
  const directions = {
    up: { y: 24 },
    down: { y: -24 },
    left: { x: 40 },
    right: { x: -40 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(4px)", ...directions[direction] }}
      whileInView={{ opacity: 1, filter: "blur(0px)", x: 0, y: 0 }}
      viewport={{ once: true, margin: "-48px" }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
