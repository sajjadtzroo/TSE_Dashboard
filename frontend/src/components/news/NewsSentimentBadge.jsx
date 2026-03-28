import { Badge } from '@mantine/core';
import rallyColors from '../../theme/rallyColors';

const SENTIMENT_MAP = {
  positive: { label: 'مثبت', color: 'green', hex: rallyColors.green },
  negative: { label: 'منفی', color: 'red', hex: rallyColors.red },
  neutral:  { label: 'خنثی', color: 'gray', hex: rallyColors.textDimmed },
};

export default function NewsSentimentBadge({ sentiment, score }) {
  const s = SENTIMENT_MAP[sentiment] || SENTIMENT_MAP.neutral;

  return (
    <Badge
      size="xs"
      variant="light"
      color={s.color}
      title={score != null ? `امتیاز: ${score.toFixed(2)}` : undefined}
    >
      {s.label}
    </Badge>
  );
}
