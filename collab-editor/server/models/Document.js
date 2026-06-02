const mongoose = require('mongoose');

// ─── Revision Schema ─────────────────────────────────────────────────────────
const revisionSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    savedBy: { type: String, default: 'Anonymous' },
    size: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ─── Document Schema ──────────────────────────────────────────────────────────
const documentSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      default: 'Untitled Document',
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      default: '',
    },
    revisions: {
      type: [revisionSchema],
      default: [],
    },
    activeUsers: {
      type: Number,
      default: 0,
    },
    lastEditedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Keep only latest 50 revisions ───────────────────────────────────────────
documentSchema.pre('save', function (next) {
  if (this.revisions.length > 50) {
    this.revisions = this.revisions.slice(-50);
  }
  next();
});

module.exports = mongoose.model('Document', documentSchema);
