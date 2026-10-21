const express = require('express');
const { live, ready } = require('../controllers/healthController');

const router = express.Router();

router.get('/live', live);
router.get('/ready', ready);

module.exports = router;
