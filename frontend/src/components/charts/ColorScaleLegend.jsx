import rallyColors from '../../theme/rallyColors';

/**
 * ColorScaleLegend
 *
 * Horizontal gradient bar showing the red -> gray -> green color scale
 * used by RallyTreemap. Place it below the treemap to explain the mapping
 * from negative change (red) through neutral (gray) to positive change (green).
 *
 * The three color stops match the interpolateColor function in RallyTreemap:
 *   #EF4444 (red, negative extreme)
 *   #475569 (gray, zero / neutral)
 *   #10B981 (green, positive extreme)
 */
export default function ColorScaleLegend({
  min = -5,
  max = 5,
  label = 'Change %',
}) {
  return (
    <div style={{ width: '100%', maxWidth: 320, margin: '0 auto' }}>
      {/* Label */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 10,
          color: rallyColors.textSecondary,
          marginBottom: 2,
          lineHeight: 1,
        }}
      >
        {label}
      </div>

      {/* Gradient bar */}
      <div
        style={{
          height: 10,
          borderRadius: 4,
          background:
            'linear-gradient(to right, #EF4444 0%, #475569 50%, #10B981 100%)',
        }}
      />

      {/* Tick labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 9,
          color: rallyColors.textDimmed,
          marginTop: 2,
          lineHeight: 1,
        }}
      >
        <span>{min}%</span>
        <span>0%</span>
        <span>{max}%</span>
      </div>
    </div>
  );
}
