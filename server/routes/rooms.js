const express = require('express');
const router = express.Router();
const Room = require('../models/Room');

function generateRoomId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

router.post('/join', async (req, res) => {
  try {
    let { roomId } = req.body;
    
    if (!roomId) {
      roomId = generateRoomId();
      while (await Room.findOne({ roomId })) {
        roomId = generateRoomId();
      }
    }
    
    let room = await Room.findOne({ roomId });
    
    if (!room) {
      room = new Room({
        roomId,
        createdAt: new Date(),
        lastActivity: new Date(),
        drawingData: []
      });
      await room.save();
    } else {
      await room.updateActivity();
    }
    
    res.json({
      success: true,
      roomId: room.roomId,
      message: room.createdAt.getTime() === room.lastActivity.getTime() ? 'Room created' : 'Joined existing room'
    });
  } catch (error) {
    console.error('Error joining/creating room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join/create room'
    });
  }
});

router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const room = await Room.findOne({ roomId });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    await room.updateActivity();
    
    res.json({
      success: true,
      room: {
        roomId: room.roomId,
        createdAt: room.createdAt,
        lastActivity: room.lastActivity,
        drawingData: room.drawingData
      }
    });
  } catch (error) {
    console.error('Error getting room info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get room info'
    });
  }
});

module.exports = router;