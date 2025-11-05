var mongoose = require('mongoose');

var UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  pendingTasks: { type: [String], default: [] },
  dateCreated: { type: Date, default: Date.now }
}, { versionKey: false });

UserSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('user', UserSchema);
