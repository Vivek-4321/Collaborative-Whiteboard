const Room = require('../models/Room');

const connectedUsers = new Map();
const roomCache = new Map();
const drawingBuffers = new Map();

const BATCH_FLUSH_INTERVAL = 500;
const MAX_BATCH_SIZE = 50;

function compressPoints(points) {
  if (points.length < 3) return points;
  
  const compressed = [points[0]];
  const tolerance = 2;
  
  for (let i = 1; i < points.length - 1; i++) {
    const prev = compressed[compressed.length - 1];
    const curr = points[i];
    const next = points[i + 1];
    
    const dist = Math.sqrt(
      Math.pow(curr.x - prev.x, 2) + 
      Math.pow(curr.y - prev.y, 2)
    );
    
    if (dist > tolerance) {
      compressed.push(curr);
    }
  }
  
  compressed.push(points[points.length - 1]);
  return compressed;
}

function convertStoredDataToClientFormat(drawingData) {
  const clientCommands = [];
  
  for (const command of drawingData) {
    if (command.type === 'clear') {
      clientCommands.push(command);
    } else if (command.type === 'stroke' && command.data.points) {
      const { strokeId, points, color, strokeWidth } = command.data;
      const timestamp = command.timestamp;
      
      if (points && points.length > 0) {
        clientCommands.push({
          type: 'stroke',
          data: {
            type: 'start',
            strokeId,
            x: points[0].x,
            y: points[0].y,
            color,
            strokeWidth
          },
          timestamp
        });
        
        for (let i = 1; i < points.length - 1; i++) {
          clientCommands.push({
            type: 'stroke',
            data: {
              type: 'move',
              strokeId,
              x: points[i].x,
              y: points[i].y,
              color,
              strokeWidth
            },
            timestamp
          });
        }
        
        if (points.length > 1) {
          clientCommands.push({
            type: 'stroke',
            data: {
              type: 'end',
              strokeId,
              x: points[points.length - 1].x,
              y: points[points.length - 1].y,
              color,
              strokeWidth
            },
            timestamp
          });
        }
      }
    } else {
      clientCommands.push(command);
    }
  }
  
  return clientCommands;
}

async function getCachedRoom(roomId) {
  if (roomCache.has(roomId)) {
    const cached = roomCache.get(roomId);
    cached.lastAccess = Date.now();
    return cached.room;
  }
  
  const room = await Room.findOne({ roomId });
  if (room) {
    roomCache.set(roomId, {
      room,
      lastAccess: Date.now()
    });
  }
  return room;
}

function initDrawingBuffer(roomId) {
  if (!drawingBuffers.has(roomId)) {
    drawingBuffers.set(roomId, {
      commands: [],
      strokes: new Map(),
      lastFlush: Date.now(),
      timer: null,
      pendingMoves: []
    });
  }
  return drawingBuffers.get(roomId);
}

async function flushDrawingBuffer(roomId, forceFlush = false) {
  const buffer = drawingBuffers.get(roomId);
  if (!buffer) return;

  try {
    const commandsToSave = [];
    
    if (forceFlush || buffer.commands.length >= MAX_BATCH_SIZE) {
      commandsToSave.push(...buffer.commands);
      buffer.commands = [];
    }
    
    if (commandsToSave.length > 0) {
      await Room.findOneAndUpdate(
        { roomId },
        { 
          $push: { drawingData: { $each: commandsToSave } },
          $set: { lastActivity: new Date() }
        },
        { new: true }
      );
      roomCache.delete(roomId);
    }
    
    buffer.lastFlush = Date.now();
  } catch (error) {
    console.error('Error flushing drawing buffer:', error);
  }
}

function scheduleFlush(roomId) {
  const buffer = drawingBuffers.get(roomId);
  if (!buffer) return;

  if (buffer.timer) {
    clearTimeout(buffer.timer);
  }
  
  buffer.timer = setTimeout(() => {
    flushDrawingBuffer(roomId);
  }, BATCH_FLUSH_INTERVAL);
}

setInterval(() => {
  const now = Date.now();
  for (const [roomId, buffer] of drawingBuffers.entries()) {
    if (now - buffer.lastFlush > 300000) {
      if (buffer.timer) clearTimeout(buffer.timer);
      drawingBuffers.delete(roomId);
    } else if (buffer.commands.length > 0 && now - buffer.lastFlush > 10000) {
      flushDrawingBuffer(roomId, true);
    }
  }
  
  for (const [roomId, room] of roomCache.entries()) {
    if (now - room.lastAccess > 600000) {
      roomCache.delete(roomId);
    }
  }
}, 30000);

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join-room', async (data) => {
      try {
        const { roomId } = data;
        
        const room = await getCachedRoom(roomId);
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }

        socket.join(roomId);
        
        connectedUsers.set(socket.id, {
          roomId,
          socketId: socket.id,
          joinedAt: new Date(),
          isDrawing: false,
          currentStroke: null
        });

        const roomUsers = Array.from(connectedUsers.values())
          .filter(user => user.roomId === roomId);

        await flushDrawingBuffer(roomId, true);
        
        const freshRoom = await Room.findOne({ roomId });
        const clientDrawingData = convertStoredDataToClientFormat(freshRoom.drawingData || []);
        
        socket.emit('room-joined', {
          roomId,
          drawingData: clientDrawingData,
          userCount: roomUsers.length
        });

        socket.to(roomId).emit('user-joined', {
          userCount: roomUsers.length
        });

        await room.updateActivity();
        
        console.log(`User ${socket.id} joined room ${roomId}`);
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('leave-room', async (data) => {
      try {
        const user = connectedUsers.get(socket.id);
        if (!user) return;

        const { roomId } = user;
        
        socket.leave(roomId);
        connectedUsers.delete(socket.id);

        const roomUsers = Array.from(connectedUsers.values())
          .filter(user => user.roomId === roomId);

        socket.to(roomId).emit('user-left', {
          userCount: roomUsers.length
        });

        await flushDrawingBuffer(roomId);
        
        const room = await getCachedRoom(roomId);
        if (room) {
          await room.updateActivity();
          roomCache.delete(roomId);
        }

        console.log(`User ${socket.id} left room ${roomId}`);
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    });

    socket.on('cursor-move', (data) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      socket.to(user.roomId).emit('cursor-update', {
        socketId: socket.id,
        x: data.x,
        y: data.y
      });
    });

    socket.on('draw-start', (data) => {
      try {
        const user = connectedUsers.get(socket.id);
        if (!user) return;

        user.isDrawing = true;
        user.currentStroke = {
          id: `${socket.id}-${Date.now()}`,
          color: data.color,
          strokeWidth: data.strokeWidth,
          points: [{ x: data.x, y: data.y }],
          startTime: Date.now()
        };

        const drawingCommand = {
          type: 'stroke',
          data: {
            type: 'start',
            strokeId: user.currentStroke.id,
            x: data.x,
            y: data.y,
            color: data.color,
            strokeWidth: data.strokeWidth
          },
          timestamp: new Date()
        };

        socket.to(user.roomId).emit('draw-update', drawingCommand);
      } catch (error) {
        console.error('Error handling draw-start:', error);
      }
    });

    socket.on('draw-move', (data) => {
      try {
        const user = connectedUsers.get(socket.id);
        if (!user || !user.isDrawing || !user.currentStroke) return;

        const drawingCommand = {
          type: 'stroke',
          data: {
            type: 'move',
            strokeId: user.currentStroke.id,
            x: data.x,
            y: data.y,
            color: user.currentStroke.color,
            strokeWidth: user.currentStroke.strokeWidth
          },
          timestamp: new Date()
        };

        socket.to(user.roomId).emit('draw-update', drawingCommand);
        
        user.currentStroke.points.push({ x: data.x, y: data.y });
      } catch (error) {
        console.error('Error handling draw-move:', error);
      }
    });

    socket.on('draw-end', async (data) => {
      try {
        const user = connectedUsers.get(socket.id);
        if (!user || !user.currentStroke) return;

        user.currentStroke.points.push({ x: data.x, y: data.y });

        const drawingCommand = {
          type: 'stroke',
          data: {
            type: 'end',
            strokeId: user.currentStroke.id,
            x: data.x,
            y: data.y,
            color: user.currentStroke.color,
            strokeWidth: user.currentStroke.strokeWidth
          },
          timestamp: new Date()
        };

        socket.to(user.roomId).emit('draw-update', drawingCommand);

        const completeStroke = {
          type: 'stroke',
          data: {
            strokeId: user.currentStroke.id,
            points: compressPoints(user.currentStroke.points),
            color: user.currentStroke.color,
            strokeWidth: user.currentStroke.strokeWidth
          },
          timestamp: new Date()
        };

        const buffer = initDrawingBuffer(user.roomId);
        buffer.commands.push(completeStroke);
        
        if (buffer.commands.length >= MAX_BATCH_SIZE) {
          await flushDrawingBuffer(user.roomId, true);
        } else {
          scheduleFlush(user.roomId);
        }
        
        user.isDrawing = false;
        user.currentStroke = null;
      } catch (error) {
        console.error('Error handling draw-end:', error);
      }
    });

    socket.on('clear-canvas', async () => {
      try {
        const user = connectedUsers.get(socket.id);
        if (!user) return;

        const clearCommand = {
          type: 'clear',
          data: {},
          timestamp: new Date()
        };

        io.to(user.roomId).emit('canvas-cleared', clearCommand);

        await flushDrawingBuffer(user.roomId);
        
        const room = await getCachedRoom(user.roomId);
        if (room) {
          await room.clearDrawing();
          roomCache.delete(user.roomId);
        }
      } catch (error) {
        console.error('Error handling clear-canvas:', error);
      }
    });

    socket.on('disconnect', async () => {
      try {
        const user = connectedUsers.get(socket.id);
        if (!user) return;

        const { roomId } = user;
        
        if (user.isDrawing && user.currentStroke) {
          const completeStroke = {
            type: 'stroke',
            data: {
              strokeId: user.currentStroke.id,
              points: compressPoints(user.currentStroke.points),
              color: user.currentStroke.color,
              strokeWidth: user.currentStroke.strokeWidth
            },
            timestamp: new Date()
          };
          
          const buffer = initDrawingBuffer(roomId);
          buffer.commands.push(completeStroke);
          await flushDrawingBuffer(roomId, true);
        }
        
        connectedUsers.delete(socket.id);

        const roomUsers = Array.from(connectedUsers.values())
          .filter(user => user.roomId === roomId);

        socket.to(roomId).emit('user-left', {
          userCount: roomUsers.length
        });

        await flushDrawingBuffer(roomId);
        
        const room = await getCachedRoom(roomId);
        if (room) {
          await room.updateActivity();
          roomCache.delete(roomId);
        }

        console.log(`User disconnected: ${socket.id}`);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });
};