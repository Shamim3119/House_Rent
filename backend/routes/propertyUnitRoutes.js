const express = require('express');
const router = express.Router();

const {
    getPropertyUnits,
    getPropertyUnitById,
    createPropertyUnit,
    updatePropertyUnit,
    deletePropertyUnit
} = require('../controllers/propertyUnitController');

const {
    authenticateToken
} = require('../middleware/authMiddleware');


// View all property units
router.get('/', authenticateToken, getPropertyUnits);


// View one property unit
router.get('/:id', authenticateToken, getPropertyUnitById);


// Create property unit
router.post('/', authenticateToken, createPropertyUnit);


// Update property unit
router.put('/:id', authenticateToken, updatePropertyUnit);


// Delete property unit
router.delete('/:id', authenticateToken, deletePropertyUnit);


module.exports = router;