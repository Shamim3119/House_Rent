const express = require('express');

const router = express.Router();

const {
    getMonthlyBills,
    getMonthlyBillById,
    getMonthlyBillRegister,
    generateMonthlyBill,
    updateMonthlyBill,
    deleteMonthlyBill
} = require('../controllers/monthlyBillController');


const {
    authenticateToken
} = require('../middleware/authMiddleware');


// =====================================================
// Authentication
// =====================================================

// router.use(authenticateToken);


// =====================================================
// Monthly Bill Register
//
// IMPORTANT:
// /register must come BEFORE /:id
// =====================================================

router.get(
    '/register',
    getMonthlyBillRegister
);


// =====================================================
// Get all monthly bills
// =====================================================

router.get(
    '/',
    getMonthlyBills
);


// =====================================================
// Get monthly bill by ID
// =====================================================

router.get(
    '/:id',
    getMonthlyBillById
);


// =====================================================
// Generate monthly bill
// =====================================================

router.post(
    '/',
    generateMonthlyBill
);


// =====================================================
// Update monthly bill
// =====================================================

router.put(
    '/:id',
    updateMonthlyBill
);


// =====================================================
// Delete monthly bill
// =====================================================

router.delete(
    '/:id',
    deleteMonthlyBill
);


module.exports = router;