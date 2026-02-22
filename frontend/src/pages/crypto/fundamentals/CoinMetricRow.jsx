import { formatUsd, formatPercent, formatNum } from '../../../utils/formatUtils';
import classes from '../../financials/FinancialStatementsTable.module.css';

const FORMAT_FNS = {
  usd: formatUsd,
  pct: (v) => formatPercent(v, 2),
  volume: formatNum,
  num: formatNum,
};

export default function CoinMetricRow({ label, values, format, isHot }) {
  const fmt = FORMAT_FNS[format] || formatNum;

  return (
    <tr className={isHot ? classes.hotRow : undefined}>
      <td className={classes.stickyCol}>{label}</td>
      {values.map((v, i) => (
        <td key={i} className={classes.valueCell}>
          {v != null ? fmt(v) : '-'}
        </td>
      ))}
    </tr>
  );
}
