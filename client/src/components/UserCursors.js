import React, { useState, useEffect, useRef } from 'react';
import './UserCursors.css';

const UserCursors = ({ socket }) => {
  const [cursors, setCursors] = useState(new Map());
  const timeoutRefs = useRef(new Map());

  const generateUniqueColor = (socketId) => {
    const hash = socketId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const hue = Math.abs(hash) % 360;
    const saturation = 70 + (Math.abs(hash >> 8) % 20);
    const lightness = 45 + (Math.abs(hash >> 16) % 15);
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const getCursorColor = (socketId) => {
    return generateUniqueColor(socketId);
  };

  useEffect(() => {
    if (!socket) return;

    const handleCursorUpdate = (data) => {
      const { socketId, x, y } = data;
      
      setCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.set(socketId, {
          x,
          y,
          color: getCursorColor(socketId),
          lastSeen: Date.now()
        });
        return newCursors;
      });

      const existingTimeout = timeoutRefs.current.get(socketId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const newTimeout = setTimeout(() => {
        setCursors(prev => {
          const newCursors = new Map(prev);
          newCursors.delete(socketId);
          return newCursors;
        });
        timeoutRefs.current.delete(socketId);
      }, 3000);

      timeoutRefs.current.set(socketId, newTimeout);
    };

    const handleUserLeft = () => {
      setCursors(new Map());
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };

    socket.on('cursor-update', handleCursorUpdate);
    socket.on('user-left', handleUserLeft);

    return () => {
      socket.off('cursor-update', handleCursorUpdate);
      socket.off('user-left', handleUserLeft);
      
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, [socket]);

  return (
    <div className="user-cursors-container">
      {Array.from(cursors.entries()).map(([socketId, cursor]) => (
        <div
          key={socketId}
          className="user-cursor"
          style={{
            left: cursor.x,
            top: cursor.y,
            '--cursor-color': cursor.color
          }}
        >
          <div className="cursor-pointer" />
          <div className="cursor-label">
            User {socketId.slice(-4)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserCursors;