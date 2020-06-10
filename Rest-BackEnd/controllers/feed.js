const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator/check');

const io = require('../socket');
const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = async (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2;
    try {
        const totalItems = await Post.find().countDocuments();
        const posts = await Post.find()
            .populate('creator')
            .sort({createdAt: -1})
            .skip((currentPage - 1) * perPage)
            .limit(perPage);

        res.status(200).json({
            message: 'Posts fetched successfully',
            posts: posts,
            totalItems: totalItems
        });

    }
    catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.createPost = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, data is entered incorrectly');
        error.statusCode = 422;
        throw error;
    }
    if (!req.file) {
        const error = new Error('No image provided');
        error.statusCode = 422;
        throw error;
    }

    const imageUrl = req.file.path.replace("\\", "/");
    const title = req.body.title;
    const content = req.body.content;

    const post = new Post({
        title: title,
        content: content,
        imageUrl: imageUrl,
        creator: req.userId
    });

    try {
        await post.save();
        const user = await User.findById(req.userId);
        user.posts.push(post);
        await user.save();
        io.getIO().emit('posts', {
            action: 'create',
            post: {
                ...post._doc,
                creator: {
                    _id: req.userId,
                    name: user.name
                }
            }
        });
        res.status(201).json({
            message: 'Post created successfully',
            post: post,
            creator: {
                _id: user._id,
                name: user.name
            }
        });
    }
    catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }

};

exports.getPost = async (req, res, next) => {
    const postId = req.params.postId;

    try {
        const post = await Post.findById(postId);
        if (!post) {
            const error = new Error('Post not found!');
            error.statusCode = 422;
            throw error;
        }
        res.status(200).json({
            message: 'Post fetched successfully',
            post: post
        });
    }
    catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updatePost = async (req, res, next) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, data is entered incorrectly');
        error.statusCode = 422;
        throw error;
    }
    const postId = req.params.postId;
    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;
    if (req.file) {
        imageUrl = req.file.path.replace("\\", "/");
    }

    if (!imageUrl) {
        const error = new Error('Image not found!');
        error.statusCode = 422;
        throw error;
    }

    try {
        const post = await Post.findById(postId).populate('creator');

        if (!post) {
            const error = new Error('Post not found!');
            error.statusCode = 422;
            throw error;
        }
        if (post.creator._id.toString() !== req.userId) {
            const error = new Error('No Authorized!');
            error.statusCode = 403;
            throw error;
        }
        if (imageUrl !== post.imageUrl) {
            clearImage(post.imageUrl);
        }
        post.title = title;
        post.imageUrl = imageUrl;
        post.content = content;

        const result = await post.save();
        io.getIO().emit('posts', {
            action: 'update',
            post: result
        });

        res.status(200).json({
            message: 'Post updated successfully',
            post: post
        });
    }
    catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

const clearImage = (filePath) => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, err => {
        console.log(err);
    });
};

exports.deletePost = async (req, res, next) => {
    const postId = req.params.postId;

    try {
        const post = await Post.findById(postId);

        if (!post) {
            const error = new Error('Post not found!');
            error.statusCode = 422;
            throw error;
        }
        if (post.creator.toString() !== req.userId) {
            const error = new Error('No Authorized!');
            error.statusCode = 403;
            throw error;
        }
        clearImage(post.imageUrl);
        await Post.findByIdAndRemove(postId);

        const user = await User.findById(req.userId);
        user.posts.pull(postId);
        await user.save();
        io.getIO().emit('posts', {
            action: 'delete',
            post: postId
        });
        res.status(200).json({
            message: 'Post deleted successfully'
        });
    }
    catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId);
        res.status(200).json({
            message: 'Status fetched successfully',
            status: user.status
        });
    }
    catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.patchStatus = async (req, res, next) => {
    const updatedStatus = req.body.status;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, data is entered incorrectly');
        error.statusCode = 422;
        throw error;
    }
    try {
        const user = await User.findById(req.userId);
        user.status = updatedStatus;
        await user.save();
        res.status(200).json({
            message: 'Status Updated Succesfully'
        });
    }
    catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};