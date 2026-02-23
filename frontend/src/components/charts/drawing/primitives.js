/**
 * Drawing primitives for lightweight-charts v5 using ISeriesPrimitive API.
 *
 * Each primitive stores data in price/time coordinates and converts to
 * screen pixels in updateAllViews(). The renderer draws on the canvas
 * using the standard 2D API via target.useMediaCoordinateSpace().
 */

// ─── Base class ──────────────────────────────────────────────────────────────

class DrawingPrimitive {
  constructor(id, type) {
    this.id = id;
    this.type = type;
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
    this._paneViews = [];
  }

  attached({ chart, series, requestUpdate }) {
    this._chart = chart;
    this._series = series;
    this._requestUpdate = requestUpdate;
  }

  detached() {
    this._chart = null;
    this._series = null;
    this._requestUpdate = null;
  }

  paneViews() {
    return this._paneViews;
  }

  updateAllViews() {
    // Subclasses override this to recompute screen coords
  }

  _timeToX(time) {
    if (!this._chart || !time) return null;
    return this._chart.timeScale().timeToCoordinate(time);
  }

  _priceToY(price) {
    if (!this._series || price == null) return null;
    return this._series.priceToCoordinate(price);
  }

  requestUpdate() {
    this._requestUpdate?.();
  }

  /** Serialize for localStorage */
  toJSON() {
    return { id: this.id, type: this.type };
  }
}

// ─── Generic renderer ────────────────────────────────────────────────────────

class DrawingRenderer {
  constructor(drawFn) {
    this._drawFn = drawFn;
  }

  draw(target) {
    target.useMediaCoordinateSpace((scope) => {
      this._drawFn(scope.context, scope.mediaSize);
    });
  }
}

class DrawingPaneView {
  constructor(primitive, zOrderVal = 'top') {
    this._primitive = primitive;
    this._zOrderVal = zOrderVal;
  }

  zOrder() {
    return this._zOrderVal;
  }

  renderer() {
    return this._primitive._renderer;
  }
}

// ─── Trend Line ──────────────────────────────────────────────────────────────

export class TrendLinePrimitive extends DrawingPrimitive {
  constructor(id, p1, p2, color = '#3B82F6', lineWidth = 2) {
    super(id, 'trendLine');
    this.p1 = p1; // { time, price }
    this.p2 = p2;
    this.color = color;
    this.lineWidth = lineWidth;
    this._renderer = new DrawingRenderer(() => {});
    this._paneViews = [new DrawingPaneView(this)];
  }

  updateAllViews() {
    const x1 = this._timeToX(this.p1.time);
    const y1 = this._priceToY(this.p1.price);
    const x2 = this._timeToX(this.p2.time);
    const y2 = this._priceToY(this.p2.price);

    this._renderer = new DrawingRenderer((ctx, size) => {
      if (x1 == null || y1 == null || x2 == null || y2 == null) return;

      // Extend line to canvas edges
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return;
      const ux = dx / len;
      const uy = dy / len;
      const ext = Math.max(size.width, size.height) * 2;

      ctx.beginPath();
      ctx.moveTo(x1 - ux * ext, y1 - uy * ext);
      ctx.lineTo(x2 + ux * ext, y2 + uy * ext);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.lineWidth;
      ctx.stroke();

      // Draw anchor dots
      for (const [x, y] of [[x1, y1], [x2, y2]]) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
    });
  }

  toJSON() {
    return { ...super.toJSON(), p1: this.p1, p2: this.p2, color: this.color, lineWidth: this.lineWidth };
  }
}

// ─── Horizontal Line ─────────────────────────────────────────────────────────

export class HorizontalLinePrimitive extends DrawingPrimitive {
  constructor(id, price, color = '#F59E0B', lineWidth = 1.5, dash = [6, 4]) {
    super(id, 'horizontalLine');
    this.price = price;
    this.color = color;
    this.lineWidth = lineWidth;
    this.dash = dash;
    this._renderer = new DrawingRenderer(() => {});
    this._paneViews = [new DrawingPaneView(this)];
  }

  updateAllViews() {
    const y = this._priceToY(this.price);

    this._renderer = new DrawingRenderer((ctx, size) => {
      if (y == null) return;

      ctx.beginPath();
      ctx.setLineDash(this.dash);
      ctx.moveTo(0, y);
      ctx.lineTo(size.width, y);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.lineWidth;
      ctx.stroke();
      ctx.setLineDash([]);

      // Price label
      const label = this.price.toLocaleString();
      ctx.font = '10px Poppins, sans-serif';
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = this.color;
      ctx.fillRect(4, y - 9, tw + 8, 18);
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 8, y);
    });
  }

  toJSON() {
    return { ...super.toJSON(), price: this.price, color: this.color, lineWidth: this.lineWidth };
  }
}

// ─── Vertical Line ───────────────────────────────────────────────────────────

export class VerticalLinePrimitive extends DrawingPrimitive {
  constructor(id, time, color = '#8B5CF6', lineWidth = 1.5, dash = [6, 4]) {
    super(id, 'verticalLine');
    this.time = time;
    this.color = color;
    this.lineWidth = lineWidth;
    this.dash = dash;
    this._renderer = new DrawingRenderer(() => {});
    this._paneViews = [new DrawingPaneView(this)];
  }

  updateAllViews() {
    const x = this._timeToX(this.time);

    this._renderer = new DrawingRenderer((ctx, size) => {
      if (x == null) return;

      ctx.beginPath();
      ctx.setLineDash(this.dash);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size.height);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.lineWidth;
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }

  toJSON() {
    return { ...super.toJSON(), time: this.time, color: this.color, lineWidth: this.lineWidth };
  }
}

// ─── Fibonacci Retracement ───────────────────────────────────────────────────

const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIB_COLORS = [
  'rgba(239,68,68,0.7)',   // 0
  'rgba(249,115,22,0.6)',  // 0.236
  'rgba(245,158,11,0.6)',  // 0.382
  'rgba(16,185,129,0.6)',  // 0.5
  'rgba(59,130,246,0.6)',  // 0.618
  'rgba(139,92,246,0.6)',  // 0.786
  'rgba(239,68,68,0.7)',   // 1
];

export class FibRetracementPrimitive extends DrawingPrimitive {
  constructor(id, p1, p2) {
    super(id, 'fibRetracement');
    this.p1 = p1; // { time, price } — start (e.g. high)
    this.p2 = p2; // { time, price } — end (e.g. low)
    this._renderer = new DrawingRenderer(() => {});
    this._paneViews = [new DrawingPaneView(this)];
  }

  updateAllViews() {
    const range = this.p1.price - this.p2.price;
    const levels = FIB_LEVELS.map((l) => ({
      level: l,
      price: this.p2.price + range * l,
    }));

    const yCoords = levels.map((lv) => ({
      ...lv,
      y: this._priceToY(lv.price),
    }));

    this._renderer = new DrawingRenderer((ctx, size) => {
      ctx.font = '10px Poppins, sans-serif';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < yCoords.length; i++) {
        const { level, price, y } = yCoords[i];
        if (y == null) continue;

        // Filled zone between this level and next
        if (i < yCoords.length - 1) {
          const nextY = yCoords[i + 1].y;
          if (nextY != null) {
            ctx.fillStyle = FIB_COLORS[i].replace(/[\d.]+\)$/, '0.06)');
            ctx.fillRect(0, Math.min(y, nextY), size.width, Math.abs(nextY - y));
          }
        }

        // Horizontal line
        ctx.beginPath();
        ctx.setLineDash([4, 3]);
        ctx.moveTo(0, y);
        ctx.lineTo(size.width, y);
        ctx.strokeStyle = FIB_COLORS[i];
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        const label = `${(level * 100).toFixed(1)}% (${price.toLocaleString()})`;
        ctx.fillStyle = FIB_COLORS[i];
        ctx.fillText(label, 8, y - 6);
      }
    });
  }

  toJSON() {
    return { ...super.toJSON(), p1: this.p1, p2: this.p2 };
  }
}

// ─── Rectangle ───────────────────────────────────────────────────────────────

export class RectanglePrimitive extends DrawingPrimitive {
  constructor(id, p1, p2, color = 'rgba(59,130,246,0.15)', borderColor = '#3B82F6') {
    super(id, 'rectangle');
    this.p1 = p1; // { time, price }
    this.p2 = p2;
    this.color = color;
    this.borderColor = borderColor;
    this._renderer = new DrawingRenderer(() => {});
    this._paneViews = [new DrawingPaneView(this)];
  }

  updateAllViews() {
    const x1 = this._timeToX(this.p1.time);
    const y1 = this._priceToY(this.p1.price);
    const x2 = this._timeToX(this.p2.time);
    const y2 = this._priceToY(this.p2.price);

    this._renderer = new DrawingRenderer((ctx) => {
      if (x1 == null || y1 == null || x2 == null || y2 == null) return;

      const left = Math.min(x1, x2);
      const top = Math.min(y1, y2);
      const w = Math.abs(x2 - x1);
      const h = Math.abs(y2 - y1);

      ctx.fillStyle = this.color;
      ctx.fillRect(left, top, w, h);
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(left, top, w, h);
    });
  }

  toJSON() {
    return { ...super.toJSON(), p1: this.p1, p2: this.p2, color: this.color, borderColor: this.borderColor };
  }
}

// ─── Preview line (while drawing, follows cursor) ────────────────────────────

export class PreviewLinePrimitive extends DrawingPrimitive {
  constructor() {
    super('__preview__', 'preview');
    this.startPoint = null; // { x, y } in media coords
    this.endPoint = null;
    this.toolType = null;
    this._renderer = new DrawingRenderer(() => {});
    this._paneViews = [new DrawingPaneView(this)];
  }

  setPoints(start, end, toolType) {
    this.startPoint = start;
    this.endPoint = end;
    this.toolType = toolType;
    this.requestUpdate();
  }

  clear() {
    this.startPoint = null;
    this.endPoint = null;
    this.toolType = null;
    this.requestUpdate();
  }

  updateAllViews() {
    const { startPoint: s, endPoint: e, toolType } = this;

    this._renderer = new DrawingRenderer((ctx, size) => {
      if (!s || !e) return;

      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.lineWidth = 1;

      if (toolType === 'rectangle') {
        const left = Math.min(s.x, e.x);
        const top = Math.min(s.y, e.y);
        ctx.strokeRect(left, top, Math.abs(e.x - s.x), Math.abs(e.y - s.y));
      } else if (toolType === 'horizontalLine') {
        ctx.beginPath();
        ctx.moveTo(0, e.y);
        ctx.lineTo(size.width, e.y);
        ctx.stroke();
      } else if (toolType === 'verticalLine') {
        ctx.beginPath();
        ctx.moveTo(e.x, 0);
        ctx.lineTo(e.x, size.height);
        ctx.stroke();
      } else {
        // trendLine, fibRetracement — show a line between two points
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(e.x, e.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    });
  }
}

// ─── Factory: recreate from saved JSON ───────────────────────────────────────

export function createFromJSON(data) {
  switch (data.type) {
    case 'trendLine':
      return new TrendLinePrimitive(data.id, data.p1, data.p2, data.color, data.lineWidth);
    case 'horizontalLine':
      return new HorizontalLinePrimitive(data.id, data.price, data.color, data.lineWidth);
    case 'verticalLine':
      return new VerticalLinePrimitive(data.id, data.time, data.color, data.lineWidth);
    case 'fibRetracement':
      return new FibRetracementPrimitive(data.id, data.p1, data.p2);
    case 'rectangle':
      return new RectanglePrimitive(data.id, data.p1, data.p2, data.color, data.borderColor);
    default:
      return null;
  }
}
