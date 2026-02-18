import { motion } from "motion/react";
import { Box, SimpleGrid, Text } from '@mantine/core';
import { STATS } from '../../../constants/landing';
import Counter from './Counter';
import Reveal from './Reveal';
import rallyColors from '../../../theme/rallyColors';

const statsContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const statItem = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 200, damping: 20 } },
};

export default function StatsSection() {
  return (
    <Reveal>
      <Box pt={24} pb={96}>
        <Text
          ta="center"
          size="sm"
          c={rallyColors.textDimmed}
          fw={500}
          mb={24}
          style={{ letterSpacing: '0.04em' }}
        >
          پلتفرم جامع بازار سرمایه
        </Text>
        <motion.div
          variants={statsContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-48px" }}
        >
          <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md">
            {STATS.map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div key={stat.label} variants={statItem}>
                  <div className="landing-trust-stat">
                    <Icon size={24} color={rallyColors.green} style={{ marginBottom: 4 }} />
                    <div className="landing-trust-stat__value">
                      <Counter end={stat.value} suffix={stat.suffix} />
                    </div>
                    <div className="landing-trust-stat__label">{stat.label}</div>
                  </div>
                </motion.div>
              );
            })}
          </SimpleGrid>
        </motion.div>
      </Box>
    </Reveal>
  );
}
