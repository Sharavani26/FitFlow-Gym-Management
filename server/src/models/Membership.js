const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    planName: { type: String, required: true },
    price: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

membershipSchema.index({ user: 1, endDate: -1 });
membershipSchema.index({ payment: 1 }, { unique: true, sparse: true });

membershipSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Membership', membershipSchema);