import { Loader, Text } from '@mantine/core';
import { formatNum } from '../../utils/formatUtils';
import styles from './OptionsChainTable.module.css';

/**
 * Options Chain T-Layout — industry-standard call/put side-by-side view.
 * @param {{ chainMap: Map<number, {call, put}>, underlyingPrice: number, loading: boolean }} props
 */
export default function OptionsChainTable({ chainMap, underlyingPrice, loading }) {
  if (loading) {
    return (
      <div className={styles.loadingOverlay}>
        <Loader size="sm" color="green" mr="sm" /> در حال بارگذاری زنجیره اختیار...
      </div>
    );
  }

  if (!chainMap || chainMap.size === 0) {
    return (
      <div className={styles.loadingOverlay}>
        <Text size="sm" c="dimmed">داده‌ای برای نمایش وجود ندارد</Text>
      </div>
    );
  }

  const price = underlyingPrice || 0;

  return (
    <div className={styles.wrapper}>
      <table className={styles.chainTable}>
        <thead>
          <tr>
            {/* Call side (RTL: right = call) */}
            <th className={`${styles.callHeader} ${styles.hideOnMobile}`}>حجم</th>
            <th className={`${styles.callHeader} ${styles.hideOnMobile}`}>OI</th>
            <th className={`${styles.callHeader} ${styles.hideOnMobile}`}>تغییر</th>
            <th className={styles.callHeader}>آخرین</th>
            <th className={styles.callHeader}>خرید</th>
            <th className={styles.callHeader}>فروش</th>

            {/* Strike */}
            <th className={styles.strikeHeader}>اعمال</th>

            {/* Put side */}
            <th className={styles.putHeader}>خرید</th>
            <th className={styles.putHeader}>فروش</th>
            <th className={styles.putHeader}>آخرین</th>
            <th className={`${styles.putHeader} ${styles.hideOnMobile}`}>تغییر</th>
            <th className={`${styles.putHeader} ${styles.hideOnMobile}`}>OI</th>
            <th className={`${styles.putHeader} ${styles.hideOnMobile}`}>حجم</th>
          </tr>
        </thead>
        <tbody>
          {[...chainMap.entries()].map(([strike, { call, put }]) => {
            const callITM = price > 0 && strike < price;
            const putITM = price > 0 && strike > price;

            return (
              <tr key={strike}>
                {/* Call side */}
                <td className={`${styles.callSide} ${callITM ? styles.itmCall : ''} ${styles.hideOnMobile}`}>
                  <Val v={call?.volume} />
                </td>
                <td className={`${styles.callSide} ${callITM ? styles.itmCall : ''} ${styles.hideOnMobile}`}>
                  <Val v={call?.open_interest} />
                </td>
                <td className={`${styles.callSide} ${callITM ? styles.itmCall : ''} ${styles.hideOnMobile}`}>
                  <ChangeVal v={call?.close_change} />
                </td>
                <td className={`${styles.callSide} ${callITM ? styles.itmCall : ''}`}>
                  <Val v={call?.last || call?.close} />
                </td>
                <td className={`${styles.callSide} ${callITM ? styles.itmCall : ''}`}>
                  <Val v={call?.bid_price_1} />
                </td>
                <td className={`${styles.callSide} ${callITM ? styles.itmCall : ''}`}>
                  <Val v={call?.ask_price_1} />
                </td>

                {/* Strike */}
                <td className={styles.strikeCell}>{formatNum(strike)}</td>

                {/* Put side */}
                <td className={`${styles.putSide} ${putITM ? styles.itmPut : ''}`}>
                  <Val v={put?.bid_price_1} />
                </td>
                <td className={`${styles.putSide} ${putITM ? styles.itmPut : ''}`}>
                  <Val v={put?.ask_price_1} />
                </td>
                <td className={`${styles.putSide} ${putITM ? styles.itmPut : ''}`}>
                  <Val v={put?.last || put?.close} />
                </td>
                <td className={`${styles.putSide} ${putITM ? styles.itmPut : ''} ${styles.hideOnMobile}`}>
                  <ChangeVal v={put?.close_change} />
                </td>
                <td className={`${styles.putSide} ${putITM ? styles.itmPut : ''} ${styles.hideOnMobile}`}>
                  <Val v={put?.open_interest} />
                </td>
                <td className={`${styles.putSide} ${putITM ? styles.itmPut : ''} ${styles.hideOnMobile}`}>
                  <Val v={put?.volume} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Render a formatted number or dash */
function Val({ v }) {
  if (v == null || v === 0) return <span className={styles.emptyCell}>-</span>;
  return <>{formatNum(v)}</>;
}

/** Render a change value with color */
function ChangeVal({ v }) {
  if (v == null) return <span className={styles.emptyCell}>-</span>;
  const cls = v > 0 ? styles.positive : v < 0 ? styles.negative : '';
  return (
    <span className={cls}>
      {v > 0 ? '+' : ''}{formatNum(v)}
    </span>
  );
}
