import mongoose from 'mongoose';
import { logger } from '../../../shared/utils/logger.js';

const cardSchema = new mongoose.Schema({
  front: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  back: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  deckId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deck',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  imageFront: {
    type: String,
    trim: true,
    default: null
  },
  imageBack: {
    type: String,
    trim: true,
    default: null
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  status: {
    type: String,
    enum: ['not_studied', 'learning', 'mastered'],
    default: 'not_studied'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  studyData: {
    timesStudied: {
      type: Number,
      default: 0
    },
    lastStudied: {
      type: Date,
      default: null
    },
    nextReview: {
      type: Date,
      default: null
    },
    easeFactor: {
      type: Number,
      default: 2.5,
      min: 1.3,
      max: 2.5
    },
    interval: {
      type: Number,
      default: 1
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
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

// Indexes
cardSchema.index({ deckId: 1, isDeleted: 1 });
cardSchema.index({ userId: 1, isDeleted: 1 });
cardSchema.index({ userId: 1, status: 1 });
cardSchema.index({ userId: 1, deckId: 1, status: 1 });

// Pre-save middleware
cardSchema.pre('save', function(next) {
  if (this.isModified('front')) {
    this.front = this.front.trim();
  }
  if (this.isModified('back')) {
    this.back = this.back.trim();
  }
  if (this.isModified('notes')) {
    this.notes = this.notes?.trim() || '';
  }
  next();
});

// Instance methods
cardSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return await this.save();
};

cardSchema.methods.restore = async function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  return await this.save();
};

cardSchema.methods.updateStatus = async function(status) {
  this.status = status;
  if (status === 'learning' || status === 'mastered') {
    this.studyData.timesStudied += 1;
    this.studyData.lastStudied = new Date();
  }
  return await this.save();
};

cardSchema.methods.updateStudyData = async function(studyData) {
  Object.assign(this.studyData, studyData);
  return await this.save();
};

cardSchema.methods.addTag = async function(tag) {
  if (!this.tags.includes(tag)) {
    this.tags.push(tag);
    return await this.save();
  }
  return this;
};

cardSchema.methods.removeTag = async function(tag) {
  this.tags = this.tags.filter(t => t !== tag);
  return await this.save();
};

// Static methods
cardSchema.statics.findByDeck = function(deckId, userId) {
  return this.find({ deckId, userId, isDeleted: false }).sort({ createdAt: -1 });
};

cardSchema.statics.findByUser = function(userId) {
  return this.find({ userId, isDeleted: false }).sort({ createdAt: -1 });
};

cardSchema.statics.findByUserAndStatus = function(userId, status) {
  return this.find({ userId, status, isDeleted: false }).sort({ createdAt: -1 });
};

cardSchema.statics.findByDeckAndStatus = function(deckId, userId, status) {
  return this.find({ deckId, userId, status, isDeleted: false }).sort({ createdAt: -1 });
};

cardSchema.statics.findActive = function() {
  return this.find({ isDeleted: false });
};

cardSchema.statics.getStatsByDeck = function(deckId, userId) {
  return this.aggregate([
    { $match: { deckId, userId, isDeleted: false } },
    { $group: { 
      _id: '$status', 
      count: { $sum: 1 } 
    }}
  ]);
};

const Card = mongoose.models.Card || mongoose.model('Card', cardSchema);

export default Card;
