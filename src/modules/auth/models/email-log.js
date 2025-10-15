import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema({
    to: {
        type: String,
        required: true,
        index: true
    },
    subject: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['sent', 'failed', 'skipped'],
        required: true,
        index: true
    },
    messageId: {
        type: String,
        index: true
    },
    response: {
        type: String
    },
    error: {
        type: mongoose.Schema.Types.Mixed
    },
    idompotencykey: {
        type: String,
        index: true,
        sparse: true
    },
    meta: {
        type: mongoose.Schema.Types.Mixed
    },
}, { timestamps: true });

emailLogSchema.index({ idempotencyKey: 1, status: 1 });

const EmailLog = mongoose.models.EmailLog || mongoose.model('EmailLog', emailLogSchema);
export default EmailLog;