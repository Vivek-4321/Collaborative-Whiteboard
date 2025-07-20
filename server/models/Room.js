const mongoose = require('mongoose');

const drawingCommandSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['stroke', 'clear']
  },
  data: {
    type: Object,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  drawingData: [drawingCommandSchema]
});

roomSchema.index({ lastActivity: 1 });

roomSchema.pre('save', function() {
  if (this.drawingData && Array.isArray(this.drawingData)) {
    this.drawingData = this.drawingData.map(command => {
      if (!command.data) {
        command.data = {};
      }
      if (!command.type) {
        command.type = 'stroke';
      }
      return command;
    });
  }
});

roomSchema.methods.updateActivity = function() {
  return this.constructor.findOneAndUpdate(
    { _id: this._id },
    { $set: { lastActivity: new Date() } },
    { new: true }
  );
};

roomSchema.methods.addDrawingCommand = function(command) {
  if (!command.data) {
    command.data = {};
  }
  return this.constructor.findOneAndUpdate(
    { _id: this._id },
    { 
      $push: { drawingData: command },
      $set: { lastActivity: new Date() }
    },
    { new: true }
  );
};

roomSchema.methods.clearDrawing = function() {
  const clearCommand = {
    type: 'clear',
    data: {},
    timestamp: new Date()
  };
  return this.constructor.findOneAndUpdate(
    { _id: this._id },
    { 
      $set: { 
        drawingData: [clearCommand],
        lastActivity: new Date() 
      }
    },
    { new: true }
  );
};

module.exports = mongoose.model('Room', roomSchema);