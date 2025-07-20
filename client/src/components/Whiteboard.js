import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import DrawingCanvas from './DrawingCanvas';
import Toolbar from './Toolbar';
import UserCursors from './UserCursors';
import './Whiteboard.css';

const Whiteboard = ({ roomId, onLeaveRoom }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [color, setColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [userCount, setUserCount] = useState(1);
  const [drawingData, setDrawingData] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const cursorThrottleRef = useRef(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setConnectionStatus('connected');
      
      newSocket.emit('join-room', { roomId });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
      setConnectionStatus('disconnected');
    });

    newSocket.on('room-joined', (data) => {
      console.log('Joined room:', data);
      setDrawingData(data.drawingData || []);
      setUserCount(data.userCount || 1);
      setConnectionStatus('joined');
    });

    newSocket.on('user-joined', (data) => {
      setUserCount(data.userCount);
    });

    newSocket.on('user-left', (data) => {
      setUserCount(data.userCount);
    });

    newSocket.on('draw-update', (drawingCommand) => {
      setDrawingData(prev => [...prev, drawingCommand]);
    });

    newSocket.on('canvas-cleared', () => {
      setDrawingData([{
        type: 'clear',
        data: {},
        timestamp: new Date()
      }]);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setConnectionStatus('error');
    });

    return () => {
      newSocket.emit('leave-room');
      newSocket.disconnect();
    };
  }, [roomId]);

  const handleCursorMove = useCallback((x, y) => {
    if (!socket || !isConnected) return;

    if (cursorThrottleRef.current) {
      clearTimeout(cursorThrottleRef.current);
    }

    cursorThrottleRef.current = setTimeout(() => {
      socket.emit('cursor-move', { x, y });
    }, 16);
  }, [socket, isConnected]);

  const handleClearCanvas = () => {
    if (!socket || !isConnected) return;
    
    if (window.confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
      socket.emit('clear-canvas');
    }
  };

  const handleDrawingUpdate = useCallback((drawingCommand) => {
    setDrawingData(prev => [...prev, drawingCommand]);
  }, []);

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit('leave-room');
      socket.disconnect();
    }
    onLeaveRoom();
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return 'Connected';
      case 'joined':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  const getConnectionStatusClass = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'connecting';
      case 'connected':
      case 'joined':
        return 'connected';
      case 'disconnected':
      case 'error':
        return 'disconnected';
      default:
        return 'unknown';
    }
  };

  return (
    <div className="whiteboard">
      <div className="whiteboard-header">
        <Toolbar
          color={color}
          strokeWidth={strokeWidth}
          onColorChange={setColor}
          onStrokeWidthChange={setStrokeWidth}
          onClearCanvas={handleClearCanvas}
          userCount={userCount}
          roomId={roomId}
        />
        <div className="whiteboard-controls">
          <div className={`connection-status ${getConnectionStatusClass()}`}>
            <div className="status-indicator" />
            <span>{getConnectionStatusText()}</span>
          </div>
          <button
            onClick={handleLeaveRoom}
            className="leave-button"
            title="Leave room"
          >
            Leave Room
          </button>
        </div>
      </div>

      <div className="whiteboard-canvas-container">
        <DrawingCanvas
          color={color}
          strokeWidth={strokeWidth}
          socket={socket}
          onCursorMove={handleCursorMove}
          drawingData={drawingData}
          onDrawingUpdate={handleDrawingUpdate}
        />
        <UserCursors socket={socket} />
      </div>

      {!isConnected && (
        <div className="connection-overlay">
          <div className="connection-message">
            <div className="spinner" />
            <p>Connecting to whiteboard...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Whiteboard;