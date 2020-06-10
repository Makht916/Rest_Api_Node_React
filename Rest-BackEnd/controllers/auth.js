const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { validationResult } = require('express-validator/check');

exports.signup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, data is entered incorrectly');
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
    }
    const email = req.body.email;
    const password = req.body.password;
    const name = req.body.name;

    try {
        const hashPassword = await bcrypt.hash(password, 12);
        const user = new User({
            name: name,
            email: email,
            password: hashPassword
        });
        await user.save();
        res.status(201).json({
            message: 'User created!',
            userId: user._id
        });
    }
    catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.login = async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    try {
        const user = await User.findOne({ email: email });
        if (!user) {
            const error = new Error('Email not found');
            error.statusCode = 401;
            error.data = errors.array();
            throw error;
        }
        const isEqual =  await bcrypt.compare(password, user.password);
        if (!isEqual) {
            const error = new Error('Invalid Password');
            error.statusCode = 401;
            throw error;
        }
        const token = await jwt.sign({
            email: user.email,
            userId: user._id.toString()
        }, 
        'secret', 
        { 
            expiresIn: '1h' 
        });
        res.status(200).json({
            token: token,
            userId: user._id.toString()
        });
        return;
    }
    catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
        return err;
    }
    
}