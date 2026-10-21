const express = require('express');
const { getCart, replaceCart } = require('../controllers/cartController');
const { authenticate, ensureUserExists } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, ensureUserExists);
router.get('/', getCart);
router.put('/', replaceCart);
module.exports = router;
