"use client";

import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Optional custom fallback; defaults to a themed gradient that fills its parent. */
  fallback?: ReactNode;
  /** Label for logging which canvas failed. */
  label?: string;
};

type State = { hasError: boolean };

/**
 * Wraps a WebGL <Canvas>. If three.js / @react-three/fiber throws while creating
 * or rendering the scene - most commonly because the browser/GPU can't provide a
 * WebGL context - this renders a static fallback instead of letting the error
 * bubble up and blank the whole page.
 *
 * Note: this catches React render/init throws. A *lost* context after successful
 * init is handled by the browser/three's own restore path.
 */
export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`[canvas] ${this.props.label ?? "3D scene"} failed to render:`, error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <CanvasFallback />;
    }
    return this.props.children;
  }
}

function CanvasFallback() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(60% 60% at 50% 38%, rgba(110, 160, 255, 0.12), transparent 70%), #05060c",
      }}
    />
  );
}
