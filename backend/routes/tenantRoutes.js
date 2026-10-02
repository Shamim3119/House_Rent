const express = require('express');
const router = express.Router();

const {
    getTenants,
    getTenantById,
    createTenant,
    updateTenant,
    deleteTenant
} = require('../controllers/tenantController');

const {
    authenticateToken
} = require('../middleware/authMiddleware');


router.get('/', authenticateToken, getTenants);

router.get('/:id', authenticateToken, getTenantById);

router.post('/', authenticateToken, createTenant);

router.put('/:id', authenticateToken, updateTenant);

router.delete('/:id', authenticateToken, deleteTenant);


module.exports = router;