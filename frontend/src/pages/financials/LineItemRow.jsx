import { formatNum } from '../../utils/formatUtils';
import classes from './FinancialStatementsTable.module.css';

export default function LineItemRow({ label, values, isHot }) {
  return (
    <tr className={isHot ? classes.hotRow : undefined}>
      <td className={classes.stickyCol}>{label}</td>
      {values.map((v, i) => (
        <td key={i} className={classes.valueCell}>
          {v != null ? formatNum(v) : '-'}
        </td>
      ))}
    </tr>
  );
}
