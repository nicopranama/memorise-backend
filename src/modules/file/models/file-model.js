import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
    originalname: {
        type: String,
        required: true
    },
    storageKey: {
        type: String,
        required: true,
        unique: true
    },
    bucket: {
        type: String,
        required: true
    },
    url: {
        type: String
    },
    size: {
        type: Number
    },
    contentType: {
        type: String
    },
    provider: {
        type: String,
        enum: ['s3', 'minio'],
        required: true
    },
    checksum: {
        type: String,
        index: true, 
        sparse: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    ownerType: {
        type: String,
        enum: ['user', 'system'],
        default: 'user'
    },
    refModel: {
        type: String,
        index: true
    },
    refId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },
    status: {
        type: String,
        enum: ['uploaded', 'processing', 'failed', 'deleted'],
        default: 'uploaded',
        index: true,
    },
    meta: {
        type: mongoose.Schema.Types.Mixed
    },
    idempotencyKey: {
        type: String,
        index: true,
        sparse: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    },
    deletedAt: {
        type: Date
    },
}, { timestamps: true });

fileSchema.index({ refModel: 1, refId: 1 });
fileSchema.index({ ownerId: 1, status: 1 });
fileSchema.index({ provider: 1, bucket: 1, storageKey: 1 }, { unique: true });

fileSchema.pre('remove', function(next) {
    this.deletedAt = new Date();
    this.status = 'deleted';
    next();
});

fileSchema.virtual('isDeleted').get(function () {
  return !!this.deletedAt;
});

fileSchema.virtual('storagePath').get(function () {
  return `${this.bucket}/${this.storageKey}`;
});

fileSchema.methods.getPresignedUrl = function (client, expiry = 3600) {
  if (this.provider === 's3') {
    return client.getSignedUrlPromise('getObject', {
      Bucket: this.bucket,
      Key: this.storageKey,
      Expires: expiry,
    });
  }
  if (this.provider === 'minio') {
    return client.presignedGetObject(this.bucket, this.storageKey, expiry);
  }
  throw new Error(`Unsupported provider: ${this.provider}`);
};

const File = mongoose.models.File || mongoose.model('File', fileSchema);
export default File;
