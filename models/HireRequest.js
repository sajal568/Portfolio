const mongoose = require('mongoose');

const hireRequestSchema = new mongoose.Schema({
    // Personal Information
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
        type: String,
        trim: true,
        maxlength: [20, 'Phone number cannot exceed 20 characters']
    },
    company: {
        type: String,
        trim: true,
        maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    
    // Project Details
    projectType: {
        type: String,
        required: [true, 'Project type is required'],
        enum: ['web-development', 'mobile-app', 'ui-ux-design', 'consulting', 'other']
    },
    projectDescription: {
        type: String,
        required: [true, 'Project description is required'],
        maxlength: [2000, 'Project description cannot exceed 2000 characters']
    },
    budget: {
        type: String,
        enum: ['under-5k', '5k-15k', '15k-50k', '50k-100k', 'above-100k', 'discuss']
    },
    timeline: {
        type: String,
        enum: ['asap', '1-month', '2-3-months', '3-6-months', '6-months-plus', 'flexible']
    },
    
    // Additional Information
    additionalInfo: {
        type: String,
        maxlength: [1000, 'Additional information cannot exceed 1000 characters']
    },
    newsletter: {
        type: Boolean,
        default: false
    },
    
    // Metadata
    status: {
        type: String,
        enum: ['new', 'reviewed', 'contacted', 'in-progress', 'completed', 'declined'],
        default: 'new'
    },
    ipAddress: {
        type: String,
        trim: true
    },
    userAgent: {
        type: String,
        trim: true
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields
});

// Index for better query performance
hireRequestSchema.index({ email: 1 });
hireRequestSchema.index({ createdAt: -1 });
hireRequestSchema.index({ status: 1 });

// Virtual for full name display
hireRequestSchema.virtual('displayName').get(function() {
    return this.company ? `${this.name} (${this.company})` : this.name;
});

// Method to get formatted creation date
hireRequestSchema.methods.getFormattedDate = function() {
    return this.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

module.exports = mongoose.model('HireRequest', hireRequestSchema);
