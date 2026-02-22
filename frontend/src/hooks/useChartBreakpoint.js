import { useMediaQuery } from '@mantine/hooks';
import { CHART_MARGIN } from '../components/charts/shared/chartStyles';

const BREAKPOINTS = {
  xs: { maxWidth: 480, margin: CHART_MARGIN.xs, fontSize: 8, tickCount: 3, legendPosition: 'hidden' },
  sm: { maxWidth: 768, margin: CHART_MARGIN.sm, fontSize: 9, tickCount: 4, legendPosition: 'below' },
  md: { maxWidth: 992, margin: CHART_MARGIN.md, fontSize: 10, tickCount: 6, legendPosition: 'below-2col' },
  lg: { maxWidth: Infinity, margin: CHART_MARGIN.lg, fontSize: 11, tickCount: 8, legendPosition: 'inline' },
};

/**
 * Hook that returns chart layout config based on viewport width.
 * Also provides `isMobile` alias for backward compatibility.
 *
 * @returns {{ breakpoint: string, margin: Object, fontSize: number, tickCount: number, legendPosition: string, isMobile: boolean }}
 */
export default function useChartBreakpoint() {
  const isXs = useMediaQuery('(max-width: 480px)');
  const isSm = useMediaQuery('(max-width: 768px)');
  const isMd = useMediaQuery('(max-width: 992px)');

  let bp;
  if (isXs) bp = 'xs';
  else if (isSm) bp = 'sm';
  else if (isMd) bp = 'md';
  else bp = 'lg';

  const config = BREAKPOINTS[bp];

  return {
    breakpoint: bp,
    margin: config.margin,
    fontSize: config.fontSize,
    tickCount: config.tickCount,
    legendPosition: config.legendPosition,
    isMobile: bp === 'xs' || bp === 'sm',
  };
}
