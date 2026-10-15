const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0.01, max: 1000000 },
    method: { type: String, required: true, enum: ['cash', 'card', 'upi', 'other'] },
    note: { type: String, trim: true, maxlength: 200, default: '' },
    status: { type: String, enum: ['pending', 'processing', 'paid', 'rejected'], default: 'paid' },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    planName: { type: String, trim: true },
    planDurationDays: { type: Number, min: 1, max: 3650 },
    paidAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

paymentSchema.index({ paidAt: -1 });
paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index(
  { user: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);

paymentSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Payment', paymentSchema);