const express = require('express');
const router = express.Router();

const {
    getTenancyCharges,
    getTenancyChargeById,
    getChargesByTenancy,
    createTenancyCharge,
    updateTenancyCharge,
    deleteTenancyCharge
} = require('../controllers/tenancyChargeController');

const {
    authenticateToken
} = require('../middleware/authMiddleware');


// All charges
router.get(
    '/',
    authenticateToken,
    getTenancyCharges
);


// Charges belonging to one tenancy
router.get(
    '/tenancy/:tenancyId',
    authenticateToken,
    getChargesByTenancy
);


// One charge
router.get(
    '/:id',
    authenticateToken,
    getTenancyChargeById
);


// Create
router.post(
    '/',
    authenticateToken,
    createTenancyCharge
);


// Update
router.put(
    '/:id',
    authenticateToken,
    updateTenancyCharge
);


// Delete
router.delete(
    '/:id',
    authenticateToken,
    deleteTenancyCharge
);


module.exports = router;