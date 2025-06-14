let express = require('express');
const { getProfile } = require('../controllers/user');
const { tokenRequired } = require('../middleware/auth');

let router = express.Router();


/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get logged in user's profile
 *     tags: [User]
 *     security:
 *       - quantumAccessToken: []
 *     responses:
 *       200:
 *         description: User profile returned
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/profile', tokenRequired, getProfile);


module.exports = router;
