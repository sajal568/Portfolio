const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const visitorSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [/\S+@\S+\.\S+/, 'Please enter a valid email address']
    },
    phone: {
        type: String,
        trim: true
    },
    company: {
        type: String,
        trim: true
    },
    purpose: {
        type: String,
        enum: ['general', 'collaboration', 'feedback', 'other'],
        default: 'general'
    },
    message: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['new', 'contacted', 'ignored'],
        default: 'new'
    },
    source: {
        type: String,
        default: 'direct'
    },
    userAgent: String,
    ipAddress: String
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Add pagination plugin
visitorSchema.plugin(mongoosePaginate);

// Indexes for better query performance
visitorSchema.index({ email: 1 });
visitorSchema.index({ status: 1 });
visitorSchema.index({ createdAt: -1 });

const Visitor = mongoose.model('Visitor', visitorSchema);

module.exports = Visitor;
