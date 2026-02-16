import rallyColors from '../../theme/rallyColors';

const sansSerif = "'Poppins', sans-serif";
const labelColor = 'rgba(238,238,238,0.5)';
const gridColor = 'rgba(238,238,238,0.04)';
const axisColor = 'rgba(238,238,238,0.1)';

export const RALLY_COLOR_SCALE = [
  rallyColors.green,
  rallyColors.blue,
  rallyColors.purple,
  rallyColors.yellow,
  rallyColors.orange,
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
      fill: '#1a1a1a',
      stroke: 'rgba(238,238,238,0.1)',
      strokeWidth: 1,
    },
    style: {
      ...baseLabelStyles,
      fill: '#EEEEEE',
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
