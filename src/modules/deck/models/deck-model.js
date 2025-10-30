import mongoose from 'mongoose';
import { logger } from '../../../shared/utils/logger.js';

const deckSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
    index: true
  },
  isDraft: {
    type: Boolean,
    default: false
  },
  draftData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  settings: {
    studyMode: {
      type: String,
      enum: ['normal', 'spaced_repetition'],
      default: 'normal'
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
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

deckSchema.index({ userId: 1, isDeleted: 1 });
deckSchema.index({ folderId: 1, isDeleted: 1 });
deckSchema.index({ userId: 1, name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
deckSchema.index({ userId: 1, isDraft: 1 });

deckSchema.virtual('cardsCount', {
  ref: 'Card',
  localField: '_id',
  foreignField: 'deckId',
  count: true
});

deckSchema.virtual('studyProgress', {
  ref: 'StudySession',
  localField: '_id',
  foreignField: 'deckId',
  count: true
});

deckSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.name = this.name.trim();
  }
  if (this.isModified('description')) {
    this.description = this.description?.trim() || '';
  }
  next();
});

deckSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return await this.save();
};

deckSchema.methods.restore = async function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  return await this.save();
};

deckSchema.methods.moveToFolder = async function(folderId) {
  this.folderId = folderId;
  return await this.save();
};

deckSchema.methods.moveToUnassigned = async function() {
  this.folderId = null;
  return await this.save();
};

deckSchema.statics.findByUser = function(userId) {
  return this.find({ userId, isDeleted: false }).sort({ createdAt: -1 });
};

deckSchema.statics.findByUserAndFolder = function(userId, folderId) {
  return this.find({ userId, folderId, isDeleted: false }).sort({ createdAt: -1 });
};

deckSchema.statics.findUnassignedByUser = function(userId) {
  return this.find({ userId, folderId: null, isDeleted: false }).sort({ createdAt: -1 });
};

deckSchema.statics.findDraftsByUser = function(userId) {
  return this.find({ userId, isDraft: true, isDeleted: false }).sort({ createdAt: -1 });
};

deckSchema.statics.findByUserAndName = function(userId, name) {
  return this.findOne({ userId, name: name.trim(), isDeleted: false });
};

deckSchema.statics.findActive = function() {
  return this.find({ isDeleted: false });
};

const Deck = mongoose.models.Deck || mongoose.model('Deck', deckSchema);

export default Deck;
