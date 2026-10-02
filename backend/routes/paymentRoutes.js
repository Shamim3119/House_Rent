const express = require('express');

const router = express.Router();

const {
    authenticateToken
} = require('../middleware/authMiddleware');

const {
    getPayments,
    getPaymentsByTenancy,
    getPaymentById,
    createPayment,
    voidPayment,
    getTenancyBalance
} = require('../controllers/paymentController');


router.use(authenticateToken);


/* =========================================================
   PAYMENT ROUTES
========================================================= */

router.get(
    '/',
    getPayments
);

router.get(
    '/tenancy/:tenancyId',
    getPaymentsByTenancy
);

router.get(
    '/tenancy/:tenancyId/balance',
    getTenancyBalance
);

router.get(
    '/:id',
    getPaymentById
);

router.post(
    '/',
    createPayment
);

router.put(
    '/:id/void',
    voidPayment
);


module.exports = router;