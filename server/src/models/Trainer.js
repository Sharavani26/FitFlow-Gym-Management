const mongoose = require('mongoose');

const trainerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true },
    phone: { type: String, trim: true, maxlength: 20, default: '' },
    specialization: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

trainerSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Trainer', trainerSchema);