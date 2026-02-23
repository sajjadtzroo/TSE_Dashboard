/**
 * Drawing plugins for Lightweight Charts v5
 * Each class implements the ISeriesPrimitive interface.
 *
 * Coordinate helpers:
 *   price → y : series.priceToCoordinate(price)
 *   time  → x : chart.timeScale().timeToCoordinate(time)
 *
 * All canvas drawing uses:
 *   target.useMediaCoordinateSpace(scope => { ... scope.context ... })
 */

import rallyColors from '../../../theme/rallyColors';

const STROKE_COLOR = rallyColors.green;       // #10B981
const FILL_COLOR   = 'rgba(16,185,129,0.15)';
const LINE_WIDTH   = 1.5;

// ---------------------------------------------------------------------------
// Shared pane-view / renderer factory
// ---------------------------------------------------------------------------

function makePaneView(renderFn) {
  return {
    renderer() {
      return {
        draw(target) {
          target.useMediaCoordinateSpace((scope) => {
            renderFn(scope.context, scope);
          });
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// TrendLinePlugin
// ---------------------------------------------------------------------------

export class TrendLinePlugin {
  constructor(p1) {
    this._p1       = p1;   // { time, price }
    this._p2       = null;
    this._finalized = false;
    this._chart    = null;
    this._series   = null;
    this._requestUpdate = null;
  }

  attached({ chart, series, requestUpdate }) {
    this._chart  = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }

  detached() {
    this._chart  = null;
    this._series = null;
    this._requestUpdate = null;
  }

  update(p2) {
    this._p2 = p2;
    this._requestUpdate?.();
  }

  finalize(p2) {
    this._p2        = p2;
    this._finalized = true;
    this._requestUpdate?.();
  }

  updateAllViews() {}

  paneViews() {
    const self = this;
    return [
      makePaneView((ctx) => {
        if (!self._chart || !self._series || !self._p2) return;

        const ts = self._chart.timeScale();
        const x1 = ts.timeToCoordinate(self._p1.time);
        const y1 = self._series.priceToCoordinate(self._p1.price);
        const x2 = ts.timeToCoordinate(self._p2.time);
        const y2 = self._series.priceToCoordinate(self._p2.price);

        if (x1 == null || y1 == null || x2 == null || y2 == null) return;

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = STROKE_COLOR;
        ctx.lineWidth   = LINE_WIDTH;

        if (!self._finalized) {
          ctx.setLineDash([6, 4]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
      }),
    ];
  }
}

// ---------------------------------------------------------------------------
// HorizontalLinePlugin
// ---------------------------------------------------------------------------

export class HorizontalLinePlugin {
  constructor(price) {
    this._price  = price;
    this._chart  = null;
    this._series = null;
    this._requestUpdate = null;
  }

  attached({ chart, series, requestUpdate }) {
    this._chart  = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }

  detached() {
    this._chart  = null;
    this._series = null;
    this._requestUpdate = null;
  }

  updateAllViews() {}

  paneViews() {
    const self = this;
    return [
      makePaneView((ctx, scope) => {
        if (!self._chart || !self._series) return;

        const y = self._series.priceToCoordinate(self._price);
        if (y == null) return;

        // Full-width horizontal line
        const width = scope.mediaSize?.width ?? ctx.canvas.width;

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = STROKE_COLOR;
        ctx.lineWidth   = LINE_WIDTH;
        ctx.setLineDash([]);
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        // Right-side price label
        const label    = self._price.toLocaleString();
        const padding  = 4;
        ctx.font       = '11px Poppins, sans-serif';
        const textW    = ctx.measureText(label).width + padding * 2;
        const labelX   = width - textW - 2;
        const labelY   = y - 9;

        ctx.fillStyle = STROKE_COLOR;
        ctx.fillRect(labelX, labelY, textW, 16);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, labelX + padding, labelY + 12);
        ctx.restore();
      }),
    ];
  }
}

// ---------------------------------------------------------------------------
// VerticalLinePlugin
// ---------------------------------------------------------------------------

export class VerticalLinePlugin {
  constructor(time) {
    this._time   = time;
    this._chart  = null;
    this._series = null;
    this._requestUpdate = null;
  }

  attached({ chart, series, requestUpdate }) {
    this._chart  = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }

  detached() {
    this._chart  = null;
    this._series = null;
    this._requestUpdate = null;
  }

  updateAllViews() {}

  paneViews() {
    const self = this;
    return [
      makePaneView((ctx, scope) => {
        if (!self._chart) return;

        const x = self._chart.timeScale().timeToCoordinate(self._time);
        if (x == null) return;

        const height = scope.mediaSize?.height ?? ctx.canvas.height;

        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = STROKE_COLOR;
        ctx.lineWidth   = LINE_WIDTH;
        ctx.setLineDash([]);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.restore();
      }),
    ];
  }
}

// ---------------------------------------------------------------------------
// RectanglePlugin
// ---------------------------------------------------------------------------

export class RectanglePlugin {
  constructor(p1) {
    this._p1       = p1;   // { time, price }
    this._p2       = null;
    this._finalized = false;
    this._chart    = null;
    this._series   = null;
    this._requestUpdate = null;
  }

  attached({ chart, series, requestUpdate }) {
    this._chart  = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }

  detached() {
    this._chart  = null;
    this._series = null;
    this._requestUpdate = null;
  }

  update(p2) {
    this._p2 = p2;
    this._requestUpdate?.();
  }

  finalize(p2) {
    this._p2        = p2;
    this._finalized = true;
    this._requestUpdate?.();
  }

  updateAllViews() {}

  paneViews() {
    const self = this;
    return [
      makePaneView((ctx) => {
        if (!self._chart || !self._series || !self._p2) return;

        const ts = self._chart.timeScale();
        const x1 = ts.timeToCoordinate(self._p1.time);
        const y1 = self._series.priceToCoordinate(self._p1.price);
        const x2 = ts.timeToCoordinate(self._p2.time);
        const y2 = self._series.priceToCoordinate(self._p2.price);

        if (x1 == null || y1 == null || x2 == null || y2 == null) return;

        const rx = Math.min(x1, x2);
        const ry = Math.min(y1, y2);
        const rw = Math.abs(x2 - x1);
        const rh = Math.abs(y2 - y1);

        ctx.save();

        // Fill
        ctx.fillStyle = FILL_COLOR;
        ctx.fillRect(rx, ry, rw, rh);

        // Stroke
        ctx.beginPath();
        ctx.strokeStyle = STROKE_COLOR;
        ctx.lineWidth   = LINE_WIDTH;
        if (!self._finalized) {
          ctx.setLineDash([6, 4]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.restore();
      }),
    ];
  }
}
