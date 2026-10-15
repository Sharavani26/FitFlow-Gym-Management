const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    checkInAt: { type: Date, required: true, default: Date.now },
    checkOutAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

attendanceSchema.index({ checkInAt: -1 });
attendanceSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { checkOutAt: null } }
);

attendanceSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Attendance', attendanceSchema);