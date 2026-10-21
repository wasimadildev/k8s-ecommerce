const express = require('express');
const { listProducts, createProduct, updateProduct } = require('../controllers/productsController');
const { authenticate, ensureUserExists, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', listProducts);
router.post('/', authenticate, ensureUserExists, requireRole('admin'), createProduct);
router.put('/:id', authenticate, ensureUserExists, requireRole('admin'), updateProduct);

module.exports = router;
