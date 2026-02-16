import rallyColors from '../../theme/rallyColors';

const sansSerif = "'PELAK', 'Poppins', sans-serif";
const labelColor = rallyColors.textSecondary;
const gridColor = 'rgba(148, 163, 184, 0.04)';
const axisColor = 'rgba(148, 163, 184, 0.1)';

export const RALLY_COLOR_SCALE = [
  rallyColors.green,
  rallyColors.blue,
  rallyColors.purple,
  rallyColors.yellow,
  rallyColors.red,
];

const baseProps = {
  width: 500,
  height: 300,
  padding: { top: 20, bottom: 40, left: 60, right: 20 },
};

const baseLabelStyles = {
  fontFamily: sansSerif,
  fontSize: 11,
  fill: labelColor,
};

const victoryRallyTheme = {
  chart: { ...baseProps },
  axis: {
    style: {
      axis: { stroke: axisColor, strokeWidth: 1 },
      grid: { stroke: gridColor, strokeWidth: 1 },
      ticks: { stroke: 'transparent', size: 0 },
      tickLabels: { ...baseLabelStyles, padding: 4 },
      axisLabel: { ...baseLabelStyles, padding: 30, fontSize: 12 },
    },
  },
  bar: {
    style: {
      data: { fill: rallyColors.green },
      labels: baseLabelStyles,
    },
    barWidth: 12,
    cornerRadius: { top: 3 },
  },
  area: {
    style: {
      data: { fill: rallyColors.green, fillOpacity: 0.3, stroke: rallyColors.green, strokeWidth: 2 },
      labels: baseLabelStyles,
    },
  },
  line: {
    style: {
      data: { stroke: rallyColors.green, strokeWidth: 2 },
      labels: baseLabelStyles,
    },
  },
  pie: {
    style: {
      data: { stroke: 'transparent', strokeWidth: 0 },
      labels: { ...baseLabelStyles, padding: 10 },
    },
    colorScale: RALLY_COLOR_SCALE,
  },
  tooltip: {
    flyoutStyle: {
      fill: rallyColors.elevated,
      stroke: 'rgba(148, 163, 184, 0.12)',
      strokeWidth: 1,
    },
    style: {
      ...baseLabelStyles,
      fill: rallyColors.textPrimary,
      fontSize: 12,
    },
    cornerRadius: 4,
    flyoutPadding: { top: 6, bottom: 6, left: 10, right: 10 },
  },
  voronoi: {
    style: {
      data: { fill: 'transparent', stroke: 'transparent' },
      labels: baseLabelStyles,
    },
  },
};

export default victoryRallyTheme;
