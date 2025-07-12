const express = require('express');
const router = express.Router();
const Blog = require('../../models/Blog');
const SportType = require('../../models/SportType'); 
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');


// @route    POST api/blogs/
// @desc     Create a new Blog & News
// @access   Public

router.post('/',
    check('category', 'Category is required').notEmpty(),
    check('sportsType', 'Sports Type is required').notEmpty(),
    check('title', 'Title is required').notEmpty(),
    check('description', 'Description is required').notEmpty(),
    auth,
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            // Fetch the sportType by name
            const sportType = await SportType.findOne({ name: req.body.sportsType });
            if (!sportType) return res.status(404).send({ message: 'Sports Type not found' });

            const blog = new Blog({
                category: req.body.category,
                sportsType: sportType._id,
                photo: req.body.photo,
                title: req.body.title,
                description: req.body.description
            });
            await blog.save();
            res.status(201).send(blog);
        } catch (error) {
            res.status(400).send(error);
        }
    });

// @route    PATCH api/blogs/:id
// @desc     Update Blog & News by ID
// @access   Public

router.patch('/:id', auth, async (req, res) => {
    try {
        if(req.body.sportsType){
            const sportType = await SportType.findOne({ name: req.body.sportsType });
            if (!sportType) return res.status(404).send({ message: 'Sports Type not found' });
            req.body.sportsType = sportType._id;
        }
        const blog = await Blog.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!blog) return res.status(404).send();
        res.send(blog);
    } catch (error) {
        res.status(400).send(error);
    }
});

// @route    GET api/blogs/blognews/:id
// @desc     Get a blog & news by ID
// @access   Public
router.get('/blognews/:id', auth, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).send();
        res.send(blog);
    } catch (error) {
        res.status(500).send(error);
    }
});


// @route    DELETE(INACTIVE) api/blogs/:id
// @desc     Delete(Inactive) a blog & news by ID
// @access   Public
router.delete('/:id', auth, async (req, res) => {
    try {
        const blog = await Blog.findByIdAndUpdate(req.params.id, { activated: false }, { new: true }).populate('sportsType', 'name');;
        if (!blog) return res.status(404).send();
        res.send(blog);
    } catch (error) {
        res.status(500).send(error);
    }
});



// @route    GET api/blogs/blogs
// @desc     Get all blogs
// @access   Public

router.get('/blogs-news', auth, async (req, res) => {
    
    try {
        const search = req.query.search || ''; // Search query
        const category = req.query.category || '' //search category
        // Build the query
        const query = {
            activated: true,
            category: {$regex: category, $options: 'i'},
            title: { $regex: search, $options: 'i' }, // Search by name
        };
        const blogs_news = await Blog.find(query).populate('sportsType', 'name');
        res.send(blogs_news);
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = router;