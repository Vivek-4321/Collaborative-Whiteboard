<div align="center">

# Collaborative Whiteboard

![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-18.x-61dafb.svg?logo=react&logoColor=white)
![Express](https://img.shields.io/badge/express-4.x-000000.svg?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248.svg?logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101.svg?logo=socket.io&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF.svg?logo=vite&logoColor=white)

</div>

A real-time collaborative whiteboard application built with the MERN stack (MongoDB, Express.js, React.js, Node.js) and Socket.io for live collaboration.

## Features

- **Real-time Drawing**: Collaborate with multiple users simultaneously
- **Room-based Sessions**: Join or create whiteboard rooms with simple codes
- **Drawing Tools**: Pencil tool with adjustable stroke width and color selection
- **Live Cursor Tracking**: See other users' cursor positions in real-time
- **Clear Canvas**: Clear the entire canvas for all users
- **Responsive Design**: Works on desktop and tablet devices
- **Persistent Storage**: Drawing data persists across sessions

## Technology Stack

- **Frontend**: React.js with Vite
- **Backend**: Node.js with Express.js
- **Database**: MongoDB
- **Real-time Communication**: Socket.io
- **Styling**: CSS

## Architecture Overview

![Architecture Diagram](https://firebasestorage.googleapis.com/v0/b/blog-app-5ed76.appspot.com/o/architecture.png?alt=media&token=bd1bf11a-65be-4dbe-8239-bb9a5e9a4941)

The application follows a client-server architecture with real-time communication:

- **Client**: React.js frontend handling UI, canvas drawing, and Socket.io connections
- **Server**: Express.js backend managing rooms, API endpoints, and Socket.io events
- **Database**: MongoDB storing room data and drawing commands
- **WebSockets**: Socket.io enabling real-time collaboration features

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Collaborative-Whiteboard
   ```

2. **Install all dependencies** (from the root directory):
   ```bash
   npm run install:all
   ```
   
   Or install dependencies separately:
   ```bash
   npm install                # Install root dependencies
   npm run install:client     # Install client dependencies
   npm run install:server     # Install server dependencies
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the `server` directory:
   ```env
   MONGODB_URI=mongodb://admin:password@localhost:27017/whiteboard?authSource=admin
   PORT=5000
   ```

4. **Start MongoDB**
   
   Using Docker (recommended):
   ```bash
   # In the root directory
   docker-compose up -d
   ```
   
   Or start your local MongoDB instance.

### Running the Application

#### Option 1: Run Both Client and Server Concurrently (Recommended)

From the root directory:
```bash
npm run dev    # Runs both client and server in development mode
```

This will start:
- Server on `http://localhost:5000`
- Client on `http://localhost:5173`

#### Option 2: Run Client and Server Separately

```bash
# Terminal 1 - Start server
npm run dev:server

# Terminal 2 - Start client  
npm run dev:client
```

#### Option 3: Production Mode

```bash
npm run start  # Runs both in production mode
```

#### Other Available Scripts

- `npm run build` - Build the client for production
- `npm run lint` - Run ESLint on the client code
- `npm run clean` - Remove all node_modules
- `npm run fresh-install` - Clean install all dependencies

### Access the Application
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

## API Documentation

### REST Endpoints

#### POST /api/rooms/join
Join an existing room or create a new one.

**Request Body:**
```json
{
  "roomId": "ABC123" // Optional: if not provided, creates new room
}
```

**Response:**
```json
{
  "success": true,
  "roomId": "ABC123",
  "message": "Room created" // or "Joined existing room"
}
```

#### GET /api/rooms/:roomId
Get room information and drawing data.

**Response:**
```json
{
  "success": true,
  "room": {
    "roomId": "ABC123",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "lastActivity": "2024-01-01T01:00:00.000Z",
    "drawingData": []
  }
}
```

### Socket Events

#### Client → Server Events

| Event | Description | Payload |
|-------|-------------|---------|
| `join-room` | Join a whiteboard room | `{ roomId: "ABC123" }` |
| `leave-room` | Leave the current room | No payload |
| `cursor-move` | Update cursor position | `{ x: 100, y: 200 }` |
| `draw-start` | Start drawing stroke | `{ x: 100, y: 200, color: "#000000", strokeWidth: 2 }` |
| `draw-move` | Continue drawing stroke | `{ x: 110, y: 210, color: "#000000", strokeWidth: 2 }` |
| `draw-end` | End drawing stroke | `{ x: 120, y: 220, color: "#000000", strokeWidth: 2 }` |
| `clear-canvas` | Clear the canvas | No payload |

#### Server → Client Events

| Event | Description | Payload |
|-------|-------------|---------|
| `room-joined` | Successful room join | `{ roomId: "ABC123", drawingData: [], userCount: 1 }` |
| `user-joined` | Another user joined | `{ userCount: 2 }` |
| `user-left` | User left the room | `{ userCount: 1 }` |
| `cursor-update` | Other user's cursor position | `{ socketId: "xyz", x: 100, y: 200 }` |
| `draw-update` | Drawing update from other user | `{ type: "stroke", data: {...}, timestamp: "..." }` |
| `canvas-cleared` | Canvas was cleared | `{ type: "clear", data: {}, timestamp: "..." }` |
| `error` | Error occurred | `{ message: "Error description" }` |

### Drawing Data Structure

#### Stroke Command
```json
{
  "type": "stroke",
  "data": {
    "type": "start|move|end",
    "x": 100,
    "y": 200,
    "color": "#000000",
    "strokeWidth": 2,
    "strokeId": "unique-stroke-id"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### Clear Command
```json
{
  "type": "clear",
  "data": {},
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Deployment Guide

### Using Docker Compose (Recommended)

1. **Production environment file**
   
   Create `.env.production` in the server directory:
   ```env
   MONGODB_URI=mongodb://admin:password@mongo:27017/whiteboard?authSource=admin
   PORT=5000
   NODE_ENV=production
   ```

2. **Deploy with Docker Compose**
   ```bash
   docker-compose up -d
   ```

### Manual Deployment

#### Backend Deployment

1. **Build and configure server**
   ```bash
   cd server
   npm install --production
   ```

2. **Set environment variables**
   ```bash
   export MONGODB_URI="your-production-mongodb-uri"
   export PORT=5000
   export NODE_ENV=production
   ```

3. **Start server with PM2 (recommended)**
   ```bash
   npm install -g pm2
   pm2 start server.js --name "whiteboard-server"
   ```

#### Frontend Deployment

1. **Build the React app**
   ```bash
   cd client
   npm run build
   ```

2. **Serve static files**
   - Deploy the `dist` folder to your web server (Nginx, Apache, Vercel, Netlify, etc.)
   - Update API endpoints to point to your production server

#### Database Setup

1. **MongoDB Atlas** (Cloud):
   - Create a MongoDB Atlas cluster
   - Update `MONGODB_URI` with your connection string

2. **Self-hosted MongoDB**:
   - Install MongoDB on your server
   - Configure authentication and security
   - Update connection string accordingly

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://admin:password@localhost:27017/whiteboard?authSource=admin` |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |

