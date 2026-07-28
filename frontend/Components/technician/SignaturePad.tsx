"use client";

import {
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type SignaturePadProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
};

export default function SignaturePad({
  value,
  onChange,
  disabled = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [hasSignature, setHasSignature] = useState(Boolean(value));

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.max(1, Math.round(rect.width * pixelRatio));
      canvas.height = Math.max(1, Math.round(rect.height * pixelRatio));

      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      configureContext(context);

      if (value) {
        drawStoredSignature(canvas, context, value);
      }
    };

    resizeCanvas();

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, [value]);

  function startDrawing(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    if (disabled) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    canvas.setPointerCapture(event.pointerId);

    const point = getCanvasPoint(canvas, event);
    drawingRef.current = true;
    lastPointRef.current = point;

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    configureContext(context);

    context.beginPath();
    context.arc(point.x, point.y, 1.25, 0, Math.PI * 2);
    context.fill();

    setHasSignature(true);
  }

  function draw(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    if (
      disabled ||
      !drawingRef.current ||
      !lastPointRef.current
    ) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const nextPoint = getCanvasPoint(canvas, event);
    const previousPoint = lastPointRef.current;

    configureContext(context);

    context.beginPath();
    context.moveTo(previousPoint.x, previousPoint.y);
    context.lineTo(nextPoint.x, nextPoint.y);
    context.stroke();

    lastPointRef.current = nextPoint;
  }

  function finishDrawing(
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) {
    if (!drawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;

    drawingRef.current = false;
    lastPointRef.current = null;

    if (!canvas) {
      return;
    }

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    const dataUrl = canvas.toDataURL("image/png");
    onChange(dataUrl);
    setHasSignature(true);
  }

  function clearSignature() {
    if (disabled) {
      return;
    }

    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.restore();

    drawingRef.current = false;
    lastPointRef.current = null;

    setHasSignature(false);
    onChange(null);
  }

  return (
    <div>
      <div
        className={`overflow-hidden rounded-2xl border bg-white ${
          disabled
            ? "border-slate-200 bg-slate-100"
            : "border-slate-300"
        }`}
      >
        <canvas
          ref={canvasRef}
          aria-label="Customer signature pad"
          className={`block h-48 w-full touch-none ${
            disabled
              ? "cursor-not-allowed"
              : "cursor-crosshair"
          }`}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
          onPointerLeave={(event) => {
            if (drawingRef.current) {
              finishDrawing(event);
            }
          }}
        />

        <div className="border-t border-slate-200 px-4 py-2">
          <div className="h-px bg-slate-300" />
          <p className="mt-2 text-center text-xs text-slate-500">
            Sign above this line
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {hasSignature
            ? "Signature captured"
            : "Use a finger, stylus or mouse to sign."}
        </p>

        <button
          type="button"
          disabled={disabled || !hasSignature}
          onClick={clearSignature}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-40"
        >
          Clear signature
        </button>
      </div>
    </div>
  );
}

function configureContext(
  context: CanvasRenderingContext2D,
) {
  context.strokeStyle = "#0f172a";
  context.fillStyle = "#0f172a";
  context.lineWidth = 2.5;
  context.lineCap = "round";
  context.lineJoin = "round";
}

function getCanvasPoint(
  canvas: HTMLCanvasElement,
  event: ReactPointerEvent<HTMLCanvasElement>,
) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function drawStoredSignature(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  value: string,
) {
  const image = new Image();

  image.onload = () => {
    const rect = canvas.getBoundingClientRect();

    context.clearRect(0, 0, rect.width, rect.height);
    context.drawImage(image, 0, 0, rect.width, rect.height);
  };

  image.src = value;
}