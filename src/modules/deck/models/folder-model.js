import mongoose from 'mongoose';
import { logger } from '../../../shared/utils/logger.js';

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  color: {
    type: String,
    trim: true,
    default: '#3B82F6',
    validate: {
      validator: function(v) {
        return /^#[0-9A-F]{6}$/i.test(v);
      },
      message: 'Color must be a valid hex color code'
    }
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      delete ret.isDeleted;
      delete ret.deletedAt;
      return ret;
    }
  }
});

folderSchema.index({ userId: 1, isDeleted: 1 });
folderSchema.index({ userId: 1, name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

folderSchema.virtual('decksCount', {
  ref: 'Deck',
  localField: '_id',
  foreignField: 'folderId',
  count: true
});

folderSchema.virtual('cardsCount', {
  ref: 'Card',
  localField: '_id',
  foreignField: 'deckId',
  count: true
});

folderSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.name = this.name.trim();
  }
  next();
});

folderSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return await this.save();
};

folderSchema.methods.restore = async function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  return await this.save();
};

folderSchema.statics.findByUser = function(userId) {
  return this.find({ userId, isDeleted: false }).sort({ createdAt: -1 });
};

folderSchema.statics.findByUserAndName = function(userId, name) {
  return this.findOne({ userId, name: name.trim(), isDeleted: false });
};

folderSchema.statics.findActive = function() {
  return this.find({ isDeleted: false });
};

const Folder = mongoose.models.Folder || mongoose.model('Folder', folderSchema);

export default Folder;
