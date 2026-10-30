const express = require('express');

const router = express.Router();

const {
    getMonthlyBills,
    getMonthlyBillById,
    getMonthlyBillRegister,
    generateMonthlyBillsForMonth,
    generateMonthlyBill,
    adjustMonthlyBill,
    getMonthlyBillAdjustments,
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
// Generate all monthly bills for selected month
// =====================================================

router.post(
    '/generate-month',
    generateMonthlyBillsForMonth
);


// =====================================================
// Adjust monthly bill
// =====================================================

router.put(
    '/:id/adjust',
    adjustMonthlyBill
);


router.get(
    '/:id/adjustments',
    getMonthlyBillAdjustments
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