import rallyColors from '../../../../../theme/rallyColors';

export const GRID_STROKE = 'rgba(156, 163, 175, 0.04)';
export const CURSOR_STROKE = { stroke: rallyColors.textDimmed, strokeDasharray: '3 3' };
export const CURSOR_FILL = { fill: 'rgba(156, 163, 175, 0.06)' };

export const axisTick = (fontSize = 11) => {
  const TickComponent = (props) => {
    const { x, y, payload, textAnchor, verticalAnchor, tickFormatter, index } = props;
    const value = payload?.value ?? '';
    const display = tickFormatter ? tickFormatter(value, index) : value;
    return (
      <text
        x={x}
        y={y}
        dy={verticalAnchor === 'start' ? 12 : 4}
        textAnchor={textAnchor || 'middle'}
        fontSize={fontSize}
        fill={rallyColors.textSecondary}
        fontFamily="inherit"
      >
        {display}
      </text>
    );
  };
  return TickComponent;
};
