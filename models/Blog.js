const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    category: {
        type: String,
        enum: ['Blog', 'News'],
        required: true
    },
    sportsType: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'SportType'  ,
        default:null
    },
    photo: { 
        type: String ,default:null
    },
    title: {
        type: String,
        required: true,default:null
    },
    date: {
        type: Date,
        default: Date.now,
    },
    description: {
        type: String,
        required: true
    },
    activated: { 
        type: Boolean, 
        default: true 
    }
});

const Blog = mongoose.model('Blog', blogSchema);
module.exports = Blog;