import React, { useState } from 'react';
import axios from 'axios';
import './RoomJoin.css';

const RoomJoin = ({ onJoinRoom }) => {
  const [roomId, setRoomId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      setError('Please enter a room code');
      return;
    }

    if (roomId.length < 6 || roomId.length > 8) {
      setError('Room code must be 6-8 characters');
      return;
    }

    if (!/^[A-Z0-9]+$/i.test(roomId)) {
      setError('Room code must contain only letters and numbers');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/rooms/join', {
        roomId: roomId.toUpperCase()
      });

      if (response.data.success) {
        onJoinRoom(response.data.roomId);
      } else {
        setError('Failed to join room');
      }
    } catch (error) {
      console.error('Error joining room:', error);
      setError('Failed to join room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/rooms/join', {});

      if (response.data.success) {
        onJoinRoom(response.data.roomId);
      } else {
        setError('Failed to create room');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      setError('Failed to create room. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase();
    if (value.length <= 8) {
      setRoomId(value);
      setError('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleJoinRoom();
    }
  };

  return (
    <div className="room-join">
      <div className="room-join-container">
        <h1>Collaborative Whiteboard</h1>
        <p>Join an existing room or create a new one</p>
        
        <div className="join-section">
          <div className="input-group">
            <input
              type="text"
              placeholder="Enter room code (6-8 characters)"
              value={roomId}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="room-input"
            />
            <button
              onClick={handleJoinRoom}
              disabled={isLoading || !roomId.trim()}
              className="join-button"
            >
              {isLoading ? 'Joining...' : 'Join Room'}
            </button>
          </div>
          
          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="divider">
          <span>or</span>
        </div>

        <button
          onClick={handleCreateRoom}
          disabled={isLoading}
          className="create-button"
        >
          {isLoading ? 'Creating...' : 'Create New Room'}
        </button>

        <div className="info">
          <p>Room codes are 6-8 characters long and can contain letters and numbers.</p>
          <p>Share your room code with others to collaborate!</p>
        </div>
      </div>
    </div>
  );
};

export default RoomJoin;