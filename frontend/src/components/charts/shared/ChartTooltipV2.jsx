import rallyColors from '../../../theme/rallyColors';
import { toPersianNum } from '../../../utils/formatUtils';

/**
 * Glassmorphism chart tooltip with color indicators and multi-line support.
 *
 * @param {Object} props
 * @param {boolean} props.active - recharts active flag
 * @param {Array}   props.payload - recharts payload
 * @param {string}  [props.label] - recharts x-axis label
 * @param {string}  [props.title] - optional fixed title
 * @param {function} [props.formatter] - (value, name, entry) => string
 * @param {function} [props.labelFormatter] - (label) => string
 * @param {boolean} [props.colorIndicator=true] - show color dots
 * @param {string}  [props.unit] - suffix for values
 * @param {number}  [props.maxItems=8] - max data rows shown
 */
export default function ChartTooltipV2({
  active,
  payload,
  label,
  title,
  formatter,
  labelFormatter,
  colorIndicator = true,
  unit = '',
  maxItems = 8,
}) {
  if (!active || !payload || !payload.length) return null;

  const displayLabel = labelFormatter ? labelFormatter(label) : label;
  const items = payload.slice(0, maxItems);

  return (
    <div style={containerStyle}>
      {(title || displayLabel) && (
        <div style={headerStyle}>
          {toPersianNum(String(title || displayLabel || ''))}
        </div>
      )}
      {items.map((entry, i) => {
        const val = formatter
          ? formatter(entry.value, entry.name, entry)
          : toPersianNum(
              typeof entry.value === 'number'
                ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                : String(entry.value ?? ''),
            );

        return (
          <div key={`${entry.name}-${i}`} style={rowStyle}>
            {colorIndicator && (
              <span
                style={{
                  ...dotStyle,
                  backgroundColor: entry.color || entry.stroke || rallyColors.green,
                }}
              />
            )}
            <span style={labelStyle}>
              {toPersianNum(String(entry.name ?? ''))}
            </span>
            <span style={valueStyle}>
              {val}{unit && ` ${unit}`}
            </span>
          </div>
        );
      })}
      {payload.length > maxItems && (
        <div style={{ color: rallyColors.textDimmed, fontSize: 10, marginTop: 2 }}>
          +{toPersianNum(String(payload.length - maxItems))} …
        </div>
      )}
    </div>
  );
}

const containerStyle = {
  background: rallyColors.glassBg,
  border: `1px solid ${rallyColors.glassBorder}`,
  boxShadow: rallyColors.glassShadow,
  backdropFilter: rallyColors.glassBlur,
  WebkitBackdropFilter: rallyColors.glassBlur,
  borderRadius: 8,
  padding: '8px 12px',
  color: rallyColors.textPrimary,
  fontSize: 12,
  lineHeight: 1.6,
  minWidth: 120,
  animation: 'tooltipFadeIn 0.15s ease',
};

const headerStyle = {
  fontWeight: 600,
  fontSize: 12,
  marginBottom: 4,
  color: rallyColors.textSecondary,
  borderBottom: `1px solid ${rallyColors.glassBorder}`,
  paddingBottom: 4,
};

const rowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const dotStyle = {
  width: 6,
  height: 6,
  borderRadius: '50%',
  flexShrink: 0,
};

const labelStyle = {
  color: rallyColors.textSecondary,
  fontSize: 11,
  flex: 1,
};

const valueStyle = {
  fontWeight: 600,
  fontSize: 12,
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'end',
};
