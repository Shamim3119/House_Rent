const express = require('express');
const router = express.Router();

const {
    getHouses,
    getHouseById,
    createHouse,
    updateHouse,
    deleteHouse
} = require('../controllers/houseController');

const {
    authenticateToken
} = require('../middleware/authMiddleware');


// All houses
router.get('/', authenticateToken, getHouses);

// Create house
router.post('/', authenticateToken, createHouse);

router.get('/:id', authenticateToken, getHouseById);

router.put('/:id', authenticateToken, updateHouse);

router.delete('/:id', authenticateToken, deleteHouse);


module.exports = router;