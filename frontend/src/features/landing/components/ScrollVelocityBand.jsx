import ScrollVelocity from './ScrollVelocity';

export default function ScrollVelocityBand() {
  return (
    <div
      style={{
        padding: '32px 0',
        overflow: 'hidden',
        borderTop: '1px solid rgba(156, 163, 175,0.06)',
        borderBottom: '1px solid rgba(156, 163, 175,0.06)',
      }}
    >
      <ScrollVelocity
        texts={['بورس · رمزارز · وام · شاخص · تحلیل · صندوق · اختیار · آتی · سهام ·']}
        velocity={60}
        damping={50}
        stiffness={400}
        numCopies={4}
        scrollerStyle={{
          color: 'rgba(156, 163, 175,0.40)',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.08em',
        }}
      />
    </div>
  );
}
