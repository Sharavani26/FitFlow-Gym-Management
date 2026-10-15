const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    price: { type: Number, required: true, min: 0 },
    durationDays: {
      type: Number,
      required: true,
      min: 1,
      max: 3650,
      validate: { validator: Number.isInteger, message: 'Duration must be a whole number of days' },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Case-insensitive unique name
planSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

planSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Plan', planSchema);