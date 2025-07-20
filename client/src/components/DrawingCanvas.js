import { useRef, useEffect, useState, useCallback } from 'react';
import './DrawingCanvas.css';

const DrawingCanvas = ({ 
  color, 
  strokeWidth, 
  socket, 
  onCursorMove,
  drawingData = [],
  onDrawingUpdate
}) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPoint, setLastPoint] = useState(null);
  const [cursorPosition, setCursorPosition] = useState({ x: -100, y: -100 });
  const [showCursor, setShowCursor] = useState(true);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;
    
    redrawCanvas();
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let currentPath = null;
    let currentColor = '#000000';
    let currentStrokeWidth = 2;

    drawingData.forEach(command => {
      if (command.type === 'clear') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        currentPath = null;
        return;
      }

      if (command.type === 'stroke') {
        const { type, x, y, color: cmdColor, strokeWidth: cmdStrokeWidth } = command.data;

        if (type === 'start') {
          currentColor = cmdColor || '#000000';
          currentStrokeWidth = cmdStrokeWidth || 2;
          
          ctx.beginPath();
          ctx.strokeStyle = currentColor;
          ctx.lineWidth = currentStrokeWidth;
          ctx.moveTo(x, y);
          currentPath = { x, y };
        } else if (type === 'move' && currentPath) {
          const controlX = (currentPath.x + x) / 2;
          const controlY = (currentPath.y + y) / 2;
          
          ctx.quadraticCurveTo(currentPath.x, currentPath.y, controlX, controlY);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(controlX, controlY);
          currentPath = { x, y };
        } else if (type === 'end') {
          if (currentPath) {
            const controlX = (currentPath.x + x) / 2;
            const controlY = (currentPath.y + y) / 2;
            
            ctx.quadraticCurveTo(currentPath.x, currentPath.y, controlX, controlY);
            ctx.lineTo(x, y);
            ctx.stroke();
          }
          currentPath = null;
        }
      }
    });
  }, [drawingData]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    
    if (e.touches && e.touches[0]) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    
    const coords = getCanvasCoordinates(e);
    setLastPoint(coords);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.moveTo(coords.x, coords.y);
    
    const drawingCommand = {
      type: 'stroke',
      data: {
        type: 'start',
        x: coords.x,
        y: coords.y,
        color: color,
        strokeWidth: strokeWidth
      },
      timestamp: new Date()
    };

    if (onDrawingUpdate) {
      onDrawingUpdate(drawingCommand);
    }

    if (socket) {
      socket.emit('draw-start', {
        x: coords.x,
        y: coords.y,
        color: color,
        strokeWidth: strokeWidth
      });
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const coords = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (lastPoint) {
      const controlX = (lastPoint.x + coords.x) / 2;
      const controlY = (lastPoint.y + coords.y) / 2;
      
      ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, controlX, controlY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(controlX, controlY);
    } else {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
    
    const drawingCommand = {
      type: 'stroke',
      data: {
        type: 'move',
        x: coords.x,
        y: coords.y,
        color: color,
        strokeWidth: strokeWidth
      },
      timestamp: new Date()
    };

    if (onDrawingUpdate) {
      onDrawingUpdate(drawingCommand);
    }

    if (socket) {
      socket.emit('draw-move', {
        x: coords.x,
        y: coords.y,
        color: color,
        strokeWidth: strokeWidth
      });
    }
    
    setLastPoint(coords);
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    setIsDrawing(false);
    
    const coords = getCanvasCoordinates(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (lastPoint) {
      const controlX = (lastPoint.x + coords.x) / 2;
      const controlY = (lastPoint.y + coords.y) / 2;
      
      ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, controlX, controlY);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
    
    const drawingCommand = {
      type: 'stroke',
      data: {
        type: 'end',
        x: coords.x,
        y: coords.y,
        color: color,
        strokeWidth: strokeWidth
      },
      timestamp: new Date()
    };

    if (onDrawingUpdate) {
      onDrawingUpdate(drawingCommand);
    }

    if (socket) {
      socket.emit('draw-end', {
        x: coords.x,
        y: coords.y,
        color: color,
        strokeWidth: strokeWidth
      });
    }
    
    setLastPoint(null);
  };

  const handleMouseMove = (e) => {
    const coords = getCanvasCoordinates(e);
    setCursorPosition(coords);
    
    if (onCursorMove) {
      onCursorMove(coords.x, coords.y);
    }
    
    if (isDrawing) {
      draw(e);
    }
  };

  const handleMouseEnter = () => {
    setShowCursor(true);
  };

  const handleMouseLeave = () => {
    setShowCursor(false);
    if (isDrawing) {
      setIsDrawing(false);
      setLastPoint(null);
    }
  };

  return (
    <div className="drawing-canvas-container">
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        onMouseDown={startDrawing}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrawing}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={startDrawing}
        onTouchMove={(e) => {
          const coords = getCanvasCoordinates(e);
          setCursorPosition(coords);
          draw(e);
        }}
        onTouchEnd={stopDrawing}
      />
      {showCursor && (
        <div
          className="custom-cursor"
          style={{
            left: cursorPosition.x - 10,
            top: cursorPosition.y - 10,
          }}
        >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          className={`crosshair-svg ${isDrawing ? 'active' : ''}`}
        >
          <circle
            cx="10"
            cy="10"
            r={Math.max(strokeWidth / 2, 2)}
            fill={color}
            opacity={isDrawing ? 0.7 : 0.5}
          />
          <line
            x1="10"
            y1="2"
            x2="10"
            y2="8"
            stroke={isDrawing ? color : '#000000'}
            strokeWidth="2"
            opacity="1"
          />
          <line
            x1="10"
            y1="12"
            x2="10"
            y2="18"
            stroke={isDrawing ? color : '#000000'}
            strokeWidth="2"
            opacity="1"
          />
          <line
            x1="2"
            y1="10"
            x2="8"
            y2="10"
            stroke={isDrawing ? color : '#000000'}
            strokeWidth="2"
            opacity="1"
          />
          <line
            x1="12"
            y1="10"
            x2="18"
            y2="10"
            stroke={isDrawing ? color : '#000000'}
            strokeWidth="2"
            opacity="1"
          />
        </svg>
        </div>
      )}
    </div>
  );
};

export default DrawingCanvas;