const express = require('express');
const router = express.Router();

const {
    getPropertyTypes,
    getPropertyTypeById,
    createPropertyType,
    updatePropertyType,
    deletePropertyType
} = require('../controllers/propertyTypeController');

const {
    authenticateToken
} = require('../middleware/authMiddleware');


// Get all property types
router.get('/', authenticateToken, getPropertyTypes);

// Get single property type
router.get('/:id', authenticateToken, getPropertyTypeById);

// Create property type
router.post('/', authenticateToken, createPropertyType);

// Update property type
router.put('/:id', authenticateToken, updatePropertyType);

// Delete property type
router.delete('/:id', authenticateToken, deletePropertyType);


module.exports = router;