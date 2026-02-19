import rallyColors from '../../theme/rallyColors';
import { toPersianNum } from '../../utils/formatUtils';
import { HEATMAP_NEUTRAL } from '../../utils/colorUtils';

/**
 * ColorScaleLegend
 *
 * Horizontal gradient bar showing the red -> neutral -> green color scale
 * used by RallyTreemap. Place it below the treemap to explain the mapping
 * from negative change (red) through neutral (dark) to positive change (green).
 *
 * The three color stops match the interpolateColor function:
 *   #EF4444 (red, negative extreme)
 *   HEATMAP_NEUTRAL (brighter neutral)
 *   #10B981 (green, positive extreme)
 */
export default function ColorScaleLegend({
  min = -5,
  max = 5,
  label = 'تغییر ٪',
  hasOutliers = false,
}) {
  return (
    <div style={{ width: '100%', maxWidth: 400, margin: '16px auto 8px' }}>
      {/* Label */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 11,
          color: rallyColors.textSecondary,
          marginBottom: 6,
          lineHeight: 1,
          fontWeight: 500,
        }}
      >
        {label}
      </div>

      {/* Gradient bar with border */}
      <div
        style={{
          height: 12,
          borderRadius: 6,
          background:
            `linear-gradient(to right, #EF4444 0%, ${HEATMAP_NEUTRAL} 50%, #10B981 100%)`,
          border: `1px solid ${rallyColors.border}`,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
        }}
      />

      {/* Tick labels */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 10,
          color: rallyColors.textDimmed,
          marginTop: 4,
          lineHeight: 1,
          fontWeight: 500,
        }}
      >
        <span style={{ color: rallyColors.red }}>{toPersianNum(min)}٪</span>
        <span>{toPersianNum(0)}٪</span>
        <span style={{ color: rallyColors.green }}>{toPersianNum(max)}٪</span>
      </div>

      {/* Outlier footnote */}
      {hasOutliers && (
        <div
          style={{
            textAlign: 'center',
            fontSize: 10,
            color: rallyColors.textDimmed,
            marginTop: 4,
            lineHeight: 1.3,
          }}
        >
          مقادیر فراتر از بازه با رنگ حداکثری نمایش داده می‌شوند
        </div>
      )}
    </div>
  );
}
