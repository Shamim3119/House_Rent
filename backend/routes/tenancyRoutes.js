const express = require('express');
const router = express.Router();

const {
    getTenancies,
    getTenancyById,
    createTenancy,
    updateTenancy,
    endTenancy,
    deleteTenancy
} = require('../controllers/tenancyController');

const {
    authenticateToken
} = require('../middleware/authMiddleware');


router.get('/', authenticateToken, getTenancies);

router.get('/:id', authenticateToken, getTenancyById);

router.post('/', authenticateToken, createTenancy);

router.put('/:id', authenticateToken, updateTenancy);

// Special action: tenant leaves the property
router.put('/:id/end', authenticateToken, endTenancy);

router.delete('/:id', authenticateToken, deleteTenancy);


module.exports = router;