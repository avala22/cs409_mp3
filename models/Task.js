var mongoose = require('mongoose');

var TaskSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  deadline: { type: Date, required: true },
  completed: { type: Boolean, default: false },
  assignedUser: { type: String, default: '' },        // user _id as string
  assignedUserName: { type: String, default: 'unassigned' },
  dateCreated: { type: Date, default: Date.now }
}, { versionKey: false });

// Use capital T for consistency
module.exports = mongoose.model('Task', TaskSchema);
