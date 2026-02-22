import { useMemo } from 'react';
import { Text } from '@mantine/core';
import rallyColors from '../../theme/rallyColors';

/**
 * SVG Binomial Tree visualization.
 * Renders stock price at each node, option value, and highlights early exercise nodes.
 *
 * @param {{ nodes: object[][], earlyExerciseNodes: [number,number][], u: number, d: number, p: number }} tree
 * @param {number} steps - Number of visible steps (1-6)
 */
export default function BinomialTreeChart({ tree, steps }) {
  const layout = useMemo(() => {
    if (!tree?.nodes?.length) return null;
    const n = Math.min(steps, tree.nodes.length - 1);
    const earlySet = new Set(
      (tree.earlyExerciseNodes || []).map(([i, j]) => `${i},${j}`)
    );

    // SVG layout
    const nodeW = 90;
    const nodeH = 44;
    const gapX = n <= 3 ? 140 : n <= 5 ? 110 : 90;
    const gapY = n <= 3 ? 70 : n <= 5 ? 55 : 44;
    const padX = 40;
    const padY = 30;
    const totalW = padX * 2 + n * gapX + nodeW;
    const totalH = padY * 2 + n * gapY + nodeH;

    const positions = [];
    const edges = [];

    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= i; j++) {
        const x = padX + i * gapX;
        // Center nodes vertically; offset = (n - i) / 2 * gapY
        const y = padY + ((n - i) / 2 + j) * gapY;
        const node = tree.nodes[i][j];
        const isEarly = earlySet.has(`${i},${j}`);

        positions.push({ i, j, x, y, node, isEarly });

        // Edges to children
        if (i < n) {
          // Down child: (i+1, j)
          const dX = padX + (i + 1) * gapX;
          const dY = padY + ((n - (i + 1)) / 2 + j) * gapY;
          edges.push({ x1: x + nodeW, y1: y + nodeH / 2, x2: dX, y2: dY + nodeH / 2, dir: 'down' });

          // Up child: (i+1, j+1)
          const uY = padY + ((n - (i + 1)) / 2 + j + 1) * gapY;
          edges.push({ x1: x + nodeW, y1: y + nodeH / 2, x2: dX, y2: uY + nodeH / 2, dir: 'up' });
        }
      }
    }

    return { positions, edges, totalW, totalH, nodeW, nodeH, p: tree.p };
  }, [tree, steps]);

  if (!layout) {
    return <Text size="sm" c="dimmed" ta="center" py="lg">پارامترها را وارد کنید</Text>;
  }

  const fmt = (v) => {
    if (v >= 10000) return Math.round(v).toLocaleString('en-US');
    if (v >= 100) return Math.round(v).toLocaleString('en-US');
    return v.toFixed(1);
  };

  return (
    <svg
      viewBox={`0 0 ${layout.totalW} ${layout.totalH}`}
      width="100%"
      height="100%"
      style={{ maxHeight: 500, overflow: 'visible' }}
    >
      {/* Edges */}
      {layout.edges.map((e, idx) => (
        <line
          key={idx}
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          stroke={e.dir === 'up' ? rallyColors.green : rallyColors.red}
          strokeWidth={1.5}
          opacity={0.5}
        />
      ))}

      {/* Probability labels on first edges */}
      {layout.edges.length >= 2 && (
        <>
          <text
            x={(layout.edges[0].x1 + layout.edges[0].x2) / 2}
            y={(layout.edges[0].y1 + layout.edges[0].y2) / 2 - 6}
            textAnchor="middle"
            fontSize={9}
            fill={rallyColors.textSecondary}
          >
            1-p={((1 - layout.p) * 100).toFixed(1)}%
          </text>
          <text
            x={(layout.edges[1].x1 + layout.edges[1].x2) / 2}
            y={(layout.edges[1].y1 + layout.edges[1].y2) / 2 - 6}
            textAnchor="middle"
            fontSize={9}
            fill={rallyColors.textSecondary}
          >
            p={((layout.p) * 100).toFixed(1)}%
          </text>
        </>
      )}

      {/* Nodes */}
      {layout.positions.map(({ i, j, x, y, node, isEarly }) => (
        <g key={`${i}-${j}`}>
          <rect
            x={x}
            y={y}
            width={layout.nodeW}
            height={layout.nodeH}
            rx={6}
            fill={isEarly ? 'rgba(234, 179, 8, 0.2)' : 'rgba(148, 163, 184, 0.08)'}
            stroke={isEarly ? rallyColors.yellow : rallyColors.glassBorder}
            strokeWidth={isEarly ? 2 : 1}
          />
          <text
            x={x + layout.nodeW / 2}
            y={y + 16}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fill={rallyColors.textPrimary}
          >
            S={fmt(node.stockPrice)}
          </text>
          <text
            x={x + layout.nodeW / 2}
            y={y + 32}
            textAnchor="middle"
            fontSize={10}
            fill={isEarly ? rallyColors.yellow : rallyColors.green}
          >
            V={fmt(node.optionValue)}
          </text>
        </g>
      ))}
    </svg>
  );
}
