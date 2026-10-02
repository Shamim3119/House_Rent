const express = require('express');
const router = express.Router();

const {
    getDashboardSummary,
    getOutstandingBills,
    getTenantLedger,
    getHouseOutstanding,
    getMonthlyCollection
} = require('../controllers/reportController');

const {
    authenticateToken
} = require('../middleware/authMiddleware');


router.get(
    '/dashboard',
    authenticateToken,
    getDashboardSummary
);


router.get(
    '/outstanding-bills',
    authenticateToken,
    getOutstandingBills
);


router.get(
    '/tenant-ledger/:tenantId',
    authenticateToken,
    getTenantLedger
);


router.get(
    '/house-outstanding',
    authenticateToken,
    getHouseOutstanding
);


router.get(
    '/monthly-collection',
    authenticateToken,
    getMonthlyCollection
);


module.exports = router;