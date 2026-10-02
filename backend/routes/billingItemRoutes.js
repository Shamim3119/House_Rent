const express = require('express');
const router = express.Router();

const {
    getBillingItems,
    getBillingItemById,
    createBillingItem,
    updateBillingItem,
    deleteBillingItem
} = require('../controllers/billingItemController');

const {
    authenticateToken
} = require('../middleware/authMiddleware');


// View all
router.get('/', authenticateToken, getBillingItems);

// View one
router.get('/:id', authenticateToken, getBillingItemById);

// Add
router.post('/', authenticateToken, createBillingItem);

// Edit
router.put('/:id', authenticateToken, updateBillingItem);

// Delete
router.delete('/:id', authenticateToken, deleteBillingItem);


module.exports = router;