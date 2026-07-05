import { useEffect, useRef } from "react";

const PAD_HEIGHT = 220;

function SignaturePad({ value = "", onChange, disabled = false }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);

  useEffect(() => {
    function paintFromValue() {
      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(Math.floor(rect.width * ratio), 1);
      canvas.height = Math.max(Math.floor(PAD_HEIGHT * ratio), 1);

      const context = canvas.getContext("2d");
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.scale(ratio, ratio);
      context.clearRect(0, 0, rect.width, PAD_HEIGHT);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, rect.width, PAD_HEIGHT);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 2.4;
      context.strokeStyle = "#111111";

      if (!value) {
        return;
      }

      const image = new Image();
      image.onload = () => {
        context.drawImage(image, 0, 0, rect.width, PAD_HEIGHT);
      };
      image.src = value;
    }

    paintFromValue();
    window.addEventListener("resize", paintFromValue);

    return () => {
      window.removeEventListener("resize", paintFromValue);
    };
  }, [value]);

  function getPoint(event) {
    const canvas = canvasRef.current;

    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function drawSegment(from, to) {
    const canvas = canvasRef.current;

    if (!canvas || !from || !to) {
      return;
    }

    const context = canvas.getContext("2d");
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    context.stroke();
  }

  function drawDot(point) {
    const canvas = canvasRef.current;

    if (!canvas || !point) {
      return;
    }

    const context = canvas.getContext("2d");
    context.beginPath();
    context.arc(point.x, point.y, 1.4, 0, Math.PI * 2);
    context.fillStyle = "#111111";
    context.fill();
  }

  function handlePointerDown(event) {
    if (disabled) {
      return;
    }

    const point = getPoint(event);

    if (!point) {
      return;
    }

    const canvas = canvasRef.current;
    drawingRef.current = true;
    lastPointRef.current = point;
    drawDot(point);
    canvas?.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  function handlePointerMove(event) {
    if (disabled || !drawingRef.current) {
      return;
    }

    const point = getPoint(event);

    if (!point || !lastPointRef.current) {
      return;
    }

    drawSegment(lastPointRef.current, point);
    lastPointRef.current = point;
    event.preventDefault();
  }

  function finishDrawing() {
    if (!drawingRef.current) {
      return;
    }

    drawingRef.current = false;
    lastPointRef.current = null;
    onChange(canvasRef.current?.toDataURL("image/jpeg", 0.92) || "");
  }

  return (
    <canvas
      ref={canvasRef}
      className={`signature-pad ${disabled ? "is-disabled" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrawing}
      onPointerLeave={finishDrawing}
      onPointerCancel={finishDrawing}
    />
  );
}

export default SignaturePad;
