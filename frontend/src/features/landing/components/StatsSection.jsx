import { useMemo } from 'react';
import { motion } from "motion/react";
import { Box, SimpleGrid, Text } from '@mantine/core';
import { ActiveIcon, VolumeIcon, MarketCapIcon, GainerIcon, LoserIcon } from '../../../components/icons/KPIIcons';
import { STATS } from '../../../constants/landing';
import { useMarketStats, useMarketOverview } from '../../../hooks/useMarketData';
import Counter from './Counter';
import Reveal from './Reveal';
import SpotlightCard from '../../../components/SpotlightCard';
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
  const { data: stats } = useMarketStats();
  const { data: rawMarket = [] } = useMarketOverview();

  const liveStats = useMemo(() => {
    const advancers = rawMarket.filter(d => d.close_change_pct > 0).length;
    const decliners = rawMarket.filter(d => d.close_change_pct < 0).length;
    const totalVolume = stats?.total_volume_today;
    const volumeDisplay = totalVolume
      ? totalVolume >= 1e12 ? Math.round(totalVolume / 1e12) : Math.round(totalVolume / 1e9)
      : null;
    const volumeSuffix = totalVolume
      ? (totalVolume >= 1e12 ? ' T' : ' B')
      : '';

    return [
      { icon: ActiveIcon, value: stats?.total_securities || 1200, suffix: '+', label: 'نماد فعال', color: rallyColors.green },
      { icon: VolumeIcon, value: volumeDisplay || 40, suffix: volumeSuffix || '+', label: 'حجم روزانه', color: rallyColors.blue },
      { icon: MarketCapIcon, value: rawMarket.length || 30, suffix: '+', label: 'سهم معامله‌شده', color: rallyColors.purple },
      { icon: GainerIcon, value: advancers || 0, suffix: '', label: 'نماد مثبت', color: rallyColors.green },
      { icon: LoserIcon, value: decliners || 0, suffix: '', label: 'نماد منفی', color: rallyColors.red },
    ];
  }, [stats, rawMarket]);

  const isLive = (stats?.total_securities ?? 0) > 0 && rawMarket.length > 0;
  const displayStats = isLive ? liveStats : STATS;

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
          {isLive ? 'آمار زنده بازار' : 'پلتفرم جامع بازار سرمایه'}
        </Text>
        <motion.div
          variants={statsContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-48px" }}
        >
          <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md">
            {displayStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div key={stat.label} variants={statItem}>
                  <SpotlightCard className="landing-trust-stat" spotlightColor="rgba(16,185,129,0.30)">
                    <Icon size={24} color={stat.color || rallyColors.green} style={{ marginBottom: 4 }} />
                    <div className="landing-trust-stat__value">
                      <Counter end={stat.value} suffix={stat.suffix} />
                    </div>
                    <div className="landing-trust-stat__label">{stat.label}</div>
                  </SpotlightCard>
                </motion.div>
              );
            })}
          </SimpleGrid>
        </motion.div>
      </Box>
    </Reveal>
  );
}
