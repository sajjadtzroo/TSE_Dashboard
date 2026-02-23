/**
 * DrawingManager — plain JS class
 *
 * Receives `chart` and `mainSeries` from the LWC instance.
 * Manages click/move subscriptions and drawing plugin lifecycle.
 */

import {
  TrendLinePlugin,
  HorizontalLinePlugin,
  VerticalLinePlugin,
  RectanglePlugin,
} from './drawingPlugins';

export class DrawingManager {
  constructor(chart, mainSeries) {
    this._chart    = chart;
    this._series   = mainSeries;

    this._activeTool       = null;
    this._pendingPlugin    = null;
    this._completedPlugins = [];

    this._clickUnsub = null;
    this._moveUnsub  = null;

    // Bind handlers so we can pass them to subscribe/unsubscribe
    this._onClick = this._onClick.bind(this);
    this._onMove  = this._onMove.bind(this);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  setActiveTool(toolName) {
    if (toolName === this._activeTool) {
      // Toggle off
      this._activeTool = null;
      this._removePending();
      this._unsubscribe();
      return;
    }

    // Switch to new tool
    this._unsubscribe();
    this._removePending();
    this._activeTool = toolName;

    if (toolName) {
      this._subscribe();
    }
  }

  clearAll() {
    const all = [...this._completedPlugins];
    if (this._pendingPlugin) all.push(this._pendingPlugin);

    for (const p of all) {
      try { this._series.detachPrimitive(p); } catch (_) { /* ignore */ }
    }

    this._completedPlugins = [];
    this._pendingPlugin    = null;
  }

  destroy() {
    this.clearAll();
    this._unsubscribe();
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  _subscribe() {
    this._chart.subscribeClick(this._onClick);
    this._chart.subscribeCrosshairMove(this._onMove);
  }

  _unsubscribe() {
    try { this._chart.unsubscribeClick(this._onClick); }      catch (_) { /* ignore */ }
    try { this._chart.unsubscribeCrosshairMove(this._onMove); } catch (_) { /* ignore */ }
  }

  _removePending() {
    if (this._pendingPlugin) {
      try { this._series.detachPrimitive(this._pendingPlugin); } catch (_) { /* ignore */ }
      this._pendingPlugin = null;
    }
  }

  _onClick(param) {
    if (!param.time || !param.point) return;

    const price = this._series.coordinateToPrice(param.point.y);
    const time  = param.time;

    if (price == null) return;

    if (!this._pendingPlugin) {
      // First click — create plugin and attach
      const p = this._createPlugin(time, price);
      if (!p) return;

      this._series.attachPrimitive(p);
      this._pendingPlugin = p;

      // Single-click tools (H-line, V-line) finalize immediately
      if (this._activeTool === 'h-line' || this._activeTool === 'v-line') {
        this._completedPlugins.push(this._pendingPlugin);
        this._pendingPlugin = null;
      }
    } else {
      // Second click — finalize two-point tools
      this._pendingPlugin.finalize({ time, price });
      this._completedPlugins.push(this._pendingPlugin);
      this._pendingPlugin = null;
    }
  }

  _onMove(param) {
    if (!this._pendingPlugin) return;
    if (!param.point || !param.time) return;

    const price = this._series.coordinateToPrice(param.point.y);
    if (price == null) return;

    this._pendingPlugin.update({ time: param.time, price });
    this._chart.requestUpdate();
  }

  _createPlugin(time, price) {
    switch (this._activeTool) {
      case 'trend-line':  return new TrendLinePlugin({ time, price });
      case 'h-line':      return new HorizontalLinePlugin(price);
      case 'v-line':      return new VerticalLinePlugin(time);
      case 'rectangle':   return new RectanglePlugin({ time, price });
      default:            return null;
    }
  }
}
