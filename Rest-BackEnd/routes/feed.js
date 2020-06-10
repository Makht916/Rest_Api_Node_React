const express = require('express');

const { body } = require('express-validator/check');

const feedController = require('../controllers/feed');

const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.get('/posts', isAuth, feedController.getPosts);

router.post('/post', isAuth, [
    body('title').trim().isLength({ min: 5 }),
    body('content').trim().isLength({ min: 5 })
], feedController.createPost);

router.get('/post/:postId', isAuth, feedController.getPost);

router.put('/post/:postId', isAuth, [
    body('title').trim().isLength({ min: 5 }),
    body('content').trim().isLength({ min: 5 })
], feedController.updatePost);

router.delete('/post/:postId', isAuth, feedController.deletePost);

router.get('/status', isAuth, feedController.getStatus);

router.patch('/status', isAuth, feedController.patchStatus);

//[
//     body('status').trim().not().isEmpty()
// ]
module.exports = router;