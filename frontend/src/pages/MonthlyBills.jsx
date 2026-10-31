import { useEffect, useRef, useState } from "react";
import { Search, Eye, Printer, ReceiptText } from "lucide-react";
import "./MonthlyBills.css";
import api from "../api/axios";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

function MonthlyBills() {
  // -------------------------------------------------
  // Current date
  // -------------------------------------------------

  const now = new Date();

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // -------------------------------------------------
  // Filters
  // -------------------------------------------------

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);

  // -------------------------------------------------
  // Data
  // -------------------------------------------------

  const [bills, setBills] = useState([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [billDetail, setBillDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [generatingBills, setGeneratingBills] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);

  // -------------------------------------------------
  // Adjust bill modal
  // -------------------------------------------------

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustBill, setAdjustBill] = useState(null);
  const [adjustItems, setAdjustItems] = useState([]);
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustmentHistory, setAdjustmentHistory] = useState([]);
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  // -------------------------------------------------
  // Payment modal
  // -------------------------------------------------

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);

  const [paymentHistory, setPaymentHistory] = useState([]);

  const [tenancyBalance, setTenancyBalance] = useState(null);

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const paymentSavingLock = useRef(false);
  const paymentRequestIdentity = useRef(null);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");

  const [paymentForm, setPaymentForm] = useState({
    payment_type: "add",
    amount: "",
    payment_date: "",
    reference_no: "",
    note: "",
  });

  const [voidPaymentId, setVoidPaymentId] = useState(null);
  const [voidSaving, setVoidSaving] = useState(false);

  const [voidHistoryOpen, setVoidHistoryOpen] = useState(false);
  const [voidHistory, setVoidHistory] = useState([]);
  const [voidHistoryLoading, setVoidHistoryLoading] = useState(false);
  const [voidHistoryError, setVoidHistoryError] = useState("");

  // -------------------------------------------------
  // Year options
  // -------------------------------------------------

  const years = [];

  for (let value = currentYear; value <= currentYear; value++) {
    years.push(value);
  }

  // -------------------------------------------------
  // Load monthly bill register
  // -------------------------------------------------

  const loadBills = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/monthly-bills/register", {
        params: {
          year,
          month,
        },
      });

      setBills(response.data?.data || []);
    } catch (err) {
      console.error("Monthly bill register error:", err);

      setBills([]);

      setError(err.response?.data?.message || "Failed to load monthly bills.");
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------
  // Initial load
  // -------------------------------------------------

  useEffect(() => {
    loadBills();

    // We intentionally load once initially.
    // Search button applies later filter changes.

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------
  // Search
  // -------------------------------------------------

  const handleSearch = (event) => {
    event.preventDefault();

    loadBills();
  };

  // -------------------------------------------------
  // Money formatter
  // -------------------------------------------------

  const formatMoney = (amount) => {
    return Number(amount || 0).toLocaleString("en-BD", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const escapeHtml = (value) => {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) {
      return "-";
    }

    return new Date(dateValue).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getLocalDateTimeValue = () => {
    const date = new Date();

    const offset = date.getTimezoneOffset();

    const localDate = new Date(date.getTime() - offset * 60 * 1000);

    return localDate.toISOString().slice(0, 16);
  };

  const getMaxPaymentDateTime = () => {
    const date = new Date();
    const offset = date.getTimezoneOffset();

    return new Date(date.getTime() - offset * 60 * 1000)
      .toISOString()
      .slice(0, 16);
  };

  // -------------------------------------------------
  // Month name
  // -------------------------------------------------

  const getMonthName = (monthNumber) => {
    const found = MONTHS.find((item) => item.value === Number(monthNumber));

    return found?.label || "";
  };

  // -------------------------------------------------
  // Total click
  //
  // Next step:
  // This will open the bill-details popup.
  // -------------------------------------------------

  const handleTotalClick = async (bill) => {
    try {
      setDetailOpen(true);
      setBillDetail(null);
      setDetailError("");
      setDetailLoading(true);

      const response = await api.get(`/monthly-bills/${bill.monthly_bill_id}`);

      setBillDetail(response.data?.data || null);
    } catch (err) {
      console.error("Monthly bill detail error:", err);

      setDetailError(
        err.response?.data?.message || "Failed to load bill details.",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  // -------------------------------------------------
  // Adjust monthly bill
  // -------------------------------------------------

  const handleAdjustClick = async (bill) => {
    try {
      setAdjustOpen(true);

      setAdjustBill(null);

      setAdjustItems([]);

      setAdjustReason("");

      setAdjustmentHistory([]);

      setAdjustError("");

      setAdjustLoading(true);

      const [billResponse, historyResponse] = await Promise.all([
        api.get(`/monthly-bills/${bill.monthly_bill_id}`),

        api.get(`/monthly-bills/${bill.monthly_bill_id}/adjustments`),
      ]);

      const detail = billResponse.data?.data;

      if (!detail) {
        throw new Error("Monthly bill details not found.");
      }

      setAdjustBill(detail);

      setAdjustItems(
        (detail.items || []).map((item) => ({
          id: item.id,
          billing_item_id: item.billing_item_id,
          name: item.name,
          amount: String(item.amount),
          original_amount: Number(item.amount),
        })),
      );

      setAdjustmentHistory(historyResponse.data?.data || []);
    } catch (err) {
      console.error("Load bill adjustment error:", err);

      setAdjustError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load bill adjustment information.",
      );
    } finally {
      setAdjustLoading(false);
    }
  };

  // -------------------------------------------------
  // Change adjustment amount
  // -------------------------------------------------

  const handleAdjustAmountChange = (billingItemId, value) => {
    setAdjustItems((currentItems) =>
      currentItems.map((item) =>
        item.billing_item_id === billingItemId
          ? {
              ...item,
              amount: value,
            }
          : item,
      ),
    );
  };

  // -------------------------------------------------
  // Calculate adjusted total
  // -------------------------------------------------

  const getAdjustedTotal = () => {
    return adjustItems.reduce((total, item) => {
      const amount = Number(item.amount);

      return total + (Number.isFinite(amount) ? amount : 0);
    }, 0);
  };

  // -------------------------------------------------
  // Close adjustment modal
  // -------------------------------------------------

  const closeAdjustModal = () => {
    if (adjustSaving) {
      return;
    }

    setAdjustOpen(false);

    setAdjustBill(null);

    setAdjustItems([]);

    setAdjustReason("");

    setAdjustmentHistory([]);

    setAdjustError("");
  };

  // -------------------------------------------------
  // Save bill adjustment
  // -------------------------------------------------

  const handleAdjustSave = async (event) => {
    event.preventDefault();

    if (!adjustBill) {
      return;
    }

    if (!adjustReason.trim()) {
      setAdjustError("Adjustment reason is required.");

      return;
    }

    if (adjustReason.trim().length > 255) {
      setAdjustError("Adjustment reason cannot exceed 255 characters.");

      return;
    }

    for (const item of adjustItems) {
      if (
        item.amount === "" ||
        !Number.isFinite(Number(item.amount)) ||
        Number(item.amount) < 0
      ) {
        setAdjustError(`Enter a valid amount for ${item.name}.`);

        return;
      }
    }

    const hasChanges = adjustItems.some(
      (item) => Number(item.amount) !== Number(item.original_amount),
    );

    if (!hasChanges) {
      setAdjustError("No bill item amounts were changed.");

      return;
    }

    try {
      setAdjustSaving(true);

      setAdjustError("");

      const payload = {
        reason: adjustReason.trim(),

        items: adjustItems.map((item) => ({
          billing_item_id: item.billing_item_id,

          amount: Number(item.amount),
        })),
      };

      await api.put(
        `/monthly-bills/${adjustBill.monthly_bill_id}/adjust`,
        payload,
      );

      // Reload selected monthly register.
      await loadBills();

      // Close modal after successful save.
      setAdjustOpen(false);

      setAdjustBill(null);

      setAdjustItems([]);

      setAdjustReason("");

      setAdjustmentHistory([]);

      setAdjustError("");
    } catch (err) {
      console.error("Adjust monthly bill error:", err);

      setAdjustError(
        err.response?.data?.message ||
          err.message ||
          "Failed to adjust monthly bill.",
      );
    } finally {
      setAdjustSaving(false);
    }
  };

  const handleGenerateBills = async () => {
    const confirmed = window.confirm(
      `Generate monthly bills for ${getMonthName(month)} ${year}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setGeneratingBills(true);
      setError("");
      setGenerationResult(null);

      const response = await api.post("/monthly-bills/generate-month", {
        year: Number(year),
        month: Number(month),
      });

      const result = response.data?.data;

      if (!result) {
        throw new Error("Invalid response from server.");
      }

      setGenerationResult(result);

      // Reload register after generation
      await loadBills();
    } catch (err) {
      console.error("Generate monthly bills error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to generate monthly bills.",
      );
    } finally {
      setGeneratingBills(false);
    }
  };

  // -------------------------------------------------
  // Payment click
  //
  // Next step:
  // This will open Add / Return popup.
  // -------------------------------------------------

  const handlePaymentClick = async (bill) => {
    paymentRequestIdentity.current = null;
    setSelectedBill(bill);
    setPaymentOpen(true);

    setPaymentHistory([]);
    setTenancyBalance(null);

    setPaymentError("");
    setPaymentSuccess("");

    setPaymentForm({
      payment_type: "add",
      amount: "",
      payment_date: getLocalDateTimeValue(),
      reference_no: "",
      note: "",
    });

    try {
      setPaymentLoading(true);

      const [historyResponse, balanceResponse] = await Promise.all([
        api.get(`/payments/tenancy/${bill.tenancy_id}`),

        api.get(`/payments/tenancy/${bill.tenancy_id}/balance`),
      ]);

      setPaymentHistory(historyResponse.data?.data || []);

      setTenancyBalance(balanceResponse.data?.data || null);
    } catch (err) {
      console.error("Payment information error:", err);

      setPaymentError(
        err.response?.data?.message || "Failed to load payment information.",
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  const closePaymentModal = () => {
    if (paymentSavingLock.current || paymentSaving) {
      return;
    }

    paymentRequestIdentity.current = null;
    setPaymentOpen(false);
    setSelectedBill(null);
    setPaymentHistory([]);
    setTenancyBalance(null);
    setPaymentError("");
    setPaymentSuccess("");
  };

  const handlePaymentFormChange = (event) => {
    const { name, value } = event.target;

    setPaymentForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handlePaymentSave = async (event) => {
    event.preventDefault();

    if (paymentSavingLock.current) return;

    if (!selectedBill) {
      return;
    }

    const amount = Number(paymentForm.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError("Payment amount must be greater than zero.");

      return;
    }

    if (!paymentForm.payment_date) {
      setPaymentError("Payment date is required.");

      return;
    }

    const selectedPaymentDate = new Date(paymentForm.payment_date);

    const currentDate = new Date();

    if (selectedPaymentDate > currentDate) {
      setPaymentError(
        "Payment date cannot be greater than the current date and time.",
      );

      return;
    }

    paymentSavingLock.current = true;
    try {
      setPaymentSaving(true);

      setPaymentError("");
      setPaymentSuccess("");

      const payload = {
        tenancy_id: selectedBill.tenancy_id,

        payment_type: paymentForm.payment_type,

        amount,

        payment_date: paymentForm.payment_date.replace("T", " ") + ":00",

        reference_no: paymentForm.reference_no,

        note: paymentForm.note,
      };

      // Stable key for retries of the same payment; changed form gets a new key.
      const signature = JSON.stringify({
        tenancy_id: Number(payload.tenancy_id),
        payment_type: payload.payment_type,
        amount: Number(payload.amount).toFixed(2),
        payment_date: payload.payment_date.slice(0, 10),
        reference_no: String(payload.reference_no ?? "").trim(),
        note: String(payload.note ?? "").trim(),
      });
      if (
        !paymentRequestIdentity.current ||
        paymentRequestIdentity.current.signature !== signature
      ) {
        paymentRequestIdentity.current = {
          signature,
          key: crypto.randomUUID(),
        };
      }
      const response = await api.post("/payments", {
        ...payload,
        idempotency_key: paymentRequestIdentity.current.key,
      });
      // The server accepted the payment; reset identity and form BEFORE refreshing.
      paymentRequestIdentity.current = null;
      setPaymentForm((current) => ({
        ...current,
        amount: "",
        reference_no: "",
        note: "",
      }));

      setPaymentSuccess(
        response.data?.message || "Payment saved successfully.",
      );

      // Reload payment history

      // -------------------------------------------------
      // Reload payment history and tenancy balance
      // -------------------------------------------------

      const [historyResponse, balanceResponse] = await Promise.all([
        api.get(`/payments/tenancy/${selectedBill.tenancy_id}`),

        api.get(`/payments/tenancy/${selectedBill.tenancy_id}/balance`),
      ]);

      setPaymentHistory(historyResponse.data?.data || []);

      setTenancyBalance(balanceResponse.data?.data || null);

      // Refresh monthly bill register

      await loadBills();
    } catch (err) {
      console.error("Save payment error:", err);

      setPaymentError(err.response?.data?.message || "Failed to save payment.");
    } finally {
      paymentSavingLock.current = false;
      setPaymentSaving(false);
    }
  };

  const handleVoidPayment = async (payment) => {
    if (payment.is_void) {
      return;
    }

    const reason = window.prompt("Enter the reason for voiding this payment:");

    if (reason === null) {
      return;
    }

    if (!reason.trim()) {
      setPaymentError("Void reason is required.");
      return;
    }

    try {
      setVoidPaymentId(payment.id);
      setVoidSaving(true);

      setPaymentError("");
      setPaymentSuccess("");

      const response = await api.put(`/payments/${payment.id}/void`, {
        void_reason: reason.trim(),
      });

      setPaymentSuccess(
        response.data?.message || "Payment voided successfully.",
      );

      // Reload history and overall ledger
      const [historyResponse, balanceResponse] = await Promise.all([
        api.get(`/payments/tenancy/${selectedBill.tenancy_id}`),

        api.get(`/payments/tenancy/${selectedBill.tenancy_id}/balance`),
      ]);

      setPaymentHistory(historyResponse.data?.data || []);

      setTenancyBalance(balanceResponse.data?.data || null);

      // Refresh selected month register
      await loadBills();
    } catch (err) {
      console.error("Void payment error:", err);

      setPaymentError(err.response?.data?.message || "Failed to void payment.");
    } finally {
      setVoidPaymentId(null);
      setVoidSaving(false);
    }
  };

  // -------------------------------------------------
  // Individual print
  //
  // We'll implement after the popup.
  // -------------------------------------------------

  const handlePrint = async (bill) => {
    try {
      setError("");

      const response = await api.get(`/monthly-bills/${bill.monthly_bill_id}`);

      const detail = response.data?.data;

      if (!detail) {
        throw new Error("Bill data not found.");
      }

      const printWindow = window.open("", "_blank", "width=850,height=900");

      if (!printWindow) {
        setError("Print window was blocked. Please allow pop-ups.");
        return;
      }

      const chargeRows = (detail.items || [])
        .map(
          (item) => `
                    <tr>
                        <td>${escapeHtml(item.name)}</td>

                        <td class="amount">
                            ${formatMoney(item.amount)}
                        </td>
                    </tr>
                `,
        )
        .join("");

      let balanceText = "Settled";

      if (detail.balance_type === "due") {
        balanceText = `Due ${formatMoney(detail.balance_amount)}`;
      } else if (detail.balance_type === "advance") {
        balanceText = `Advance ${formatMoney(detail.balance_amount)}`;
      }

      const html = `
    <!DOCTYPE html>

    <html>

    <head>

        <meta charset="UTF-8">

        <title>Monthly Bill</title>

        <style>

            body {
                margin: 0;
                padding: 25px;
                font-family: Arial, sans-serif;
                color: #111;
                background: white;
            }

            .print-wrapper {
                max-width: 760px;
                margin: 0 auto;
            }

            .print-button {
                text-align: right;
                margin-bottom: 15px;
            }

            .print-button button {
                padding: 8px 18px;
                cursor: pointer;
            }

            .bill {
                border: 1px solid #999;
                padding: 25px;
            }

            .bill-header {
                text-align: center;
                padding-bottom: 15px;
                margin-bottom: 20px;
                border-bottom: 2px solid #222;
            }

            .bill-header h1 {
                margin: 0;
                font-size: 25px;
            }

            .bill-header h2 {
                margin: 7px 0;
                font-size: 18px;
            }

            .bill-header p {
                margin: 0;
                font-size: 13px;
            }

            .info-table,
            .charge-table,
            .summary-table {
                width: 100%;
                border-collapse: collapse;
            }

            .info-table {
                margin-bottom: 20px;
            }

            .info-table td {
                padding: 5px;
                font-size: 14px;
            }

            .label {
                font-weight: bold;
                width: 120px;
            }

            .charge-table th,
            .charge-table td {
                border: 1px solid #aaa;
                padding: 8px;
            }

            .charge-table th {
                text-align: left;
                background: #eee;
            }

            .amount {
                text-align: right;
                width: 180px;
            }

            .summary-table {
                margin-top: 20px;
            }

            .summary-table td {
                padding: 6px;
            }

            .summary-label {
                text-align: right;
                font-weight: bold;
            }

            .summary-value {
                width: 180px;
                text-align: right;
                font-weight: bold;
            }

            .balance-row td {
                border-top: 2px solid #222;
                padding-top: 10px;
            }

            .note {
                margin-top: 30px;
                padding-top: 15px;
                border-top: 1px solid #aaa;
                font-size: 13px;
            }

            @media print {

                body {
                    padding: 0;
                }

                .print-button {
                    display: none;
                }

                .bill {
                    border: none;
                }

            }

        </style>

    </head>

    <body>

        <div class="print-wrapper">

            <div class="print-button">

                <button onclick="window.print()">
                    Print
                </button>

            </div>


            <div class="bill">


                <div class="bill-header">

                    <h1>
                        ${escapeHtml(detail.house?.name)}
                    </h1>

                    <h2>
                        Monthly Rent Bill
                    </h2>

                    <p>
                        ${escapeHtml(detail.house?.address)}
                    </p>

                </div>


                <table class="info-table">

                    <tr>

                        <td class="label">
                            Tenant:
                        </td>

                        <td>
                            ${escapeHtml(detail.tenant?.name)}
                        </td>

                        <td class="label">
                            Billing Month:
                        </td>

                        <td>
                            ${escapeHtml(detail.billing_month)}
                        </td>

                    </tr>


                    <tr>

                        <td class="label">
                            Unit:
                        </td>

                        <td>
                            ${escapeHtml(detail.property_unit?.name)}
                        </td>

                        <td class="label">
                            Due Date:
                        </td>

                        <td>
                            ${escapeHtml(detail.due_date)}
                        </td>

                    </tr>


                    <tr>

                        <td class="label">
                            Phone:
                        </td>

                        <td>
                            ${escapeHtml(detail.tenant?.phone)}
                        </td>

                        <td class="label">
                            House:
                        </td>

                        <td>
                            ${escapeHtml(detail.house?.name)}
                        </td>

                    </tr>

                </table>


                <table class="charge-table">

                    <thead>

                        <tr>

                            <th>
                                Billing Item
                            </th>

                            <th class="amount">
                                Amount
                            </th>

                        </tr>

                    </thead>

                    <tbody>
                        ${chargeRows}
                    </tbody>

                </table>


                <table class="summary-table">

                    <tr>

                        <td class="summary-label">
                            Previous Balance:
                        </td>

                        <td class="summary-value">
                            ${formatMoney(detail.previous_balance)}
                        </td>

                    </tr>


                    <tr>

                        <td class="summary-label">
                            Current Bill:
                        </td>

                        <td class="summary-value">
                            ${formatMoney(detail.total_amount)}
                        </td>

                    </tr>


                    <tr>

                        <td class="summary-label">
                            Payment:
                        </td>

                        <td class="summary-value">
                            ${formatMoney(detail.month_payment)}
                        </td>

                    </tr>


                    <tr class="balance-row">

                        <td class="summary-label">
                            Closing Balance:
                        </td>

                        <td class="summary-value">
                            ${balanceText}
                        </td>

                    </tr>

                </table>


                <div class="note">

                    <strong>Note:</strong>

                    Please pay the rent by 5th of each
                    calendar month.

                </div>


            </div>

        </div>

    </body>

    </html>
            `;

      printWindow.document.open();

      printWindow.document.write(html);

      printWindow.document.close();

      printWindow.focus();
    } catch (err) {
      console.error("Print bill error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to prepare bill for printing.",
      );
    }
  };

  const handleOpenVoidHistory = async () => {
    setVoidHistoryOpen(true);
    setVoidHistory([]);
    setVoidHistoryError("");
    setVoidHistoryLoading(true);

    try {
      const response = await api.get("/payments/void-history");

      setVoidHistory(response.data?.data || []);
    } catch (err) {
      console.error("Void history error:", err);

      setVoidHistoryError(
        err.response?.data?.message || "Failed to load payment void history.",
      );
    } finally {
      setVoidHistoryLoading(false);
    }
  };

  const handleCloseVoidHistory = () => {
    setVoidHistoryOpen(false);
    setVoidHistory([]);
    setVoidHistoryError("");
  };

  // -------------------------------------------------
  // Preview all
  //
  // We'll implement after individual print.
  // -------------------------------------------------

  const handlePreviewAll = async () => {
    try {
      setError("");

      if (bills.length === 0) {
        setError("No bills found to preview.");
        return;
      }

      // ---------------------------------------------
      // Open window immediately.
      // This helps avoid browser popup blocking
      // while we wait for API requests.
      // ---------------------------------------------

      const previewWindow = window.open("", "_blank", "width=1000,height=900");

      if (!previewWindow) {
        setError("Preview window was blocked. Please allow pop-ups.");

        return;
      }

      previewWindow.document.write(`
                <!DOCTYPE html>

                <html>

                <head>
                    <title>Preparing Bills...</title>
                </head>

                <body
                    style="
                        font-family: Arial, sans-serif;
                        padding: 30px;
                    "
                >
                    Preparing monthly bill preview...
                </body>

                </html>
            `);

      previewWindow.document.close();

      // ---------------------------------------------
      // Load complete details for every bill
      // ---------------------------------------------

      const responses = await Promise.all(
        bills.map((bill) => api.get(`/monthly-bills/${bill.monthly_bill_id}`)),
      );

      const billDetails = responses
        .map((response) => response.data?.data)
        .filter(Boolean);

      if (billDetails.length === 0) {
        previewWindow.close();

        setError("No bill information could be loaded.");

        return;
      }

      // ---------------------------------------------
      // Create each bill
      // ---------------------------------------------

      const billSections = billDetails
        .map((detail, index) => {
          const chargeRows = (detail.items || [])
            .map(
              (item) => `
                                <tr>

                                    <td>
                                        ${escapeHtml(item.name)}
                                    </td>

                                    <td class="amount">
                                        ${formatMoney(item.amount)}
                                    </td>

                                </tr>
                            `,
            )
            .join("");

          let balanceText = "Settled";

          let balanceClass = "settled";

          if (detail.balance_type === "due") {
            balanceText = `Due ${formatMoney(detail.balance_amount)}`;

            balanceClass = "due";
          } else if (detail.balance_type === "advance") {
            balanceText = `Advance ${formatMoney(detail.balance_amount)}`;

            balanceClass = "advance";
          }

          return `

                        <section
                            class="bill-page ${
                              index < billDetails.length - 1 ? "page-break" : ""
                            }"
                        >

                            <div class="bill-header">

                                <h1>
                                    ${escapeHtml(detail.house?.name)}
                                </h1>

                                <h2>
                                    Monthly Rent Bill
                                </h2>

                                <p>
                                    ${escapeHtml(detail.house?.address)}
                                </p>

                            </div>


                            <table class="info-table">

                                <tr>

                                    <td class="label">
                                        Tenant:
                                    </td>

                                    <td>
                                        ${escapeHtml(detail.tenant?.name)}
                                    </td>


                                    <td class="label">
                                        Billing Month:
                                    </td>

                                    <td>
                                        ${escapeHtml(detail.billing_month)}
                                    </td>

                                </tr>


                                <tr>

                                    <td class="label">
                                        Unit:
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                          detail.property_unit?.name,
                                        )}
                                    </td>


                                    <td class="label">
                                        Due Date:
                                    </td>

                                    <td>
                                        ${escapeHtml(detail.due_date)}
                                    </td>

                                </tr>


                                <tr>

                                    <td class="label">
                                        Phone:
                                    </td>

                                    <td>
                                        ${escapeHtml(detail.tenant?.phone)}
                                    </td>


                                    <td class="label">
                                        House:
                                    </td>

                                    <td>
                                        ${escapeHtml(detail.house?.name)}
                                    </td>

                                </tr>

                            </table>


                            <table class="charge-table">

                                <thead>

                                    <tr>

                                        <th>
                                            Billing Item
                                        </th>

                                        <th class="amount">
                                            Amount
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    ${chargeRows}

                                </tbody>

                            </table>


                            <table class="summary-table">

                                <tr>

                                    <td class="summary-label">
                                        Previous Balance:
                                    </td>

                                    <td class="summary-value">
                                        ${formatMoney(detail.previous_balance)}
                                    </td>

                                </tr>


                                <tr>

                                    <td class="summary-label">
                                        Current Bill:
                                    </td>

                                    <td class="summary-value">
                                        ${formatMoney(detail.total_amount)}
                                    </td>

                                </tr>


                                <tr>

                                    <td class="summary-label">
                                        Payment:
                                    </td>

                                    <td class="summary-value">
                                        ${formatMoney(detail.month_payment)}
                                    </td>

                                </tr>


                                <tr class="balance-row">

                                    <td class="summary-label">
                                        Closing Balance:
                                    </td>

                                    <td
                                        class="
                                            summary-value
                                            ${balanceClass}
                                        "
                                    >
                                        ${balanceText}
                                    </td>

                                </tr>

                            </table>


                            <div class="note">

                                <strong>Note:</strong>

                                Please pay the rent by 5th
                                of each calendar month.

                            </div>

                        </section>

                    `;
        })
        .join("");

      // ---------------------------------------------
      // Complete preview document
      // ---------------------------------------------

      const html = `

                <!DOCTYPE html>

                <html>

                <head>

                    <meta charset="UTF-8">

                    <title>
                        Monthly Bills -
                        ${escapeHtml(getMonthName(month))}
                        ${year}
                    </title>


                    <style>

                        * {
                            box-sizing: border-box;
                        }


                        body {
                            margin: 0;
                            padding: 25px;
                            font-family:
                                Arial,
                                sans-serif;
                            color: #111;
                            background: #f5f5f5;
                        }


                        .preview-actions {
                            max-width: 800px;
                            margin:
                                0 auto
                                15px auto;
                            text-align: right;
                        }


                        .preview-actions button {
                            padding: 9px 18px;
                            cursor: pointer;
                            border: 0;
                            border-radius: 6px;
                            background: #1d4ed8;
                            color: white;
                        }


                        .bill-page {
                            width: 100%;
                            max-width: 800px;
                            margin:
                                0 auto
                                25px auto;
                            padding: 28px;
                            background: white;
                            border: 1px solid #aaa;
                        }


                        .bill-header {
                            text-align: center;
                            border-bottom:
                                2px solid #222;
                            padding-bottom: 15px;
                            margin-bottom: 20px;
                        }


                        .bill-header h1 {
                            margin: 0;
                            font-size: 25px;
                        }


                        .bill-header h2 {
                            margin: 7px 0;
                            font-size: 18px;
                        }


                        .bill-header p {
                            margin: 0;
                            font-size: 13px;
                        }


                        .info-table,
                        .charge-table,
                        .summary-table {
                            width: 100%;
                            border-collapse: collapse;
                        }


                        .info-table {
                            margin-bottom: 20px;
                        }


                        .info-table td {
                            padding: 5px;
                            font-size: 14px;
                        }


                        .label {
                            width: 120px;
                            font-weight: bold;
                        }


                        .charge-table th,
                        .charge-table td {
                            padding: 8px;
                            border: 1px solid #aaa;
                        }


                        .charge-table th {
                            text-align: left;
                            background: #eee;
                        }


                        .amount {
                            width: 180px;
                            text-align: right;
                        }


                        .summary-table {
                            margin-top: 20px;
                        }


                        .summary-table td {
                            padding: 6px;
                        }


                        .summary-label {
                            text-align: right;
                            font-weight: bold;
                        }


                        .summary-value {
                            width: 180px;
                            text-align: right;
                            font-weight: bold;
                        }


                        .balance-row td {
                            border-top:
                                2px solid #222;
                            padding-top: 10px;
                        }


                        .due {
                            color: #b91c1c;
                        }


                        .advance,
                        .settled {
                            color: #047857;
                        }


                        .note {
                            margin-top: 30px;
                            padding-top: 15px;
                            border-top:
                                1px solid #aaa;
                            font-size: 13px;
                        }


                        @media print {

                            body {
                                padding: 0;
                                background: white;
                            }


                            .preview-actions {
                                display: none;
                            }


                            .bill-page {
                                max-width: none;
                                margin: 0;
                                border: 0;
                            }


                            .page-break {
                                break-after: page;
                                page-break-after:
                                    always;
                            }

                        }

                    </style>

                </head>


                <body>


                    <div class="preview-actions">

                        <button
                            onclick="window.print()"
                        >
                            Print All
                        </button>

                    </div>


                    ${billSections}


                </body>

                </html>
            `;

      previewWindow.document.open();

      previewWindow.document.write(html);

      previewWindow.document.close();

      previewWindow.focus();
    } catch (err) {
      console.error("Preview all bills error:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to prepare monthly bill preview.",
      );
    }
  };

  const closeDetailModal = () => {
    setDetailOpen(false);
    setBillDetail(null);
    setDetailError("");
  };

  return (
    <div className="page-container">
      {/* =========================================
                PAGE HEADER
            ========================================= */}

      <div className="page-header">
        <div>
          <h1>Monthly Bills</h1>

          <p>View monthly bills, payments and tenant balances.</p>
        </div>
      </div>

      {/* =========================================
                FILTER CARD
            ========================================= */}

      <div className="card">
        <form onSubmit={handleSearch} className="bill-filter-row">
          <div className="form-group">
            <label>Year</label>

            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {years.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Month</label>

            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
            >
              {MONTHS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="bill-filter-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              <Search size={17} />

              {loading ? "Loading..." : "Search"}
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleGenerateBills}
              disabled={generatingBills}
            >
              {generatingBills ? "Generating..." : "Generate Bills"}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePreviewAll}
              disabled={loading || bills.length === 0}
            >
              <Eye size={17} />
              Preview All
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleOpenVoidHistory}
            >
              <ReceiptText size={17} />
              Void History
            </button>
          </div>

          {generationResult && (
            <div className="bill-generation-result">
              <strong>Bill generation completed.</strong>

              <span>Eligible: {generationResult.eligible}</span>

              <span>Generated: {generationResult.generated}</span>

              <span>Skipped: {generationResult.skipped}</span>

              <span>Failed: {generationResult.failed}</span>
            </div>
          )}
        </form>
      </div>

      {/* =========================================
                ERROR
            ========================================= */}

      {error && <div className="alert alert-danger">{error}</div>}

      {/* =========================================
                REGISTER
            ========================================= */}

      <div className="card bill-register-card">
        <div className="card-header">
          <div>
            <h2>
              {getMonthName(month)} {year}
            </h2>

            <p>Monthly bill register</p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table bill-register-table">
            <thead>
              <tr>
                <th>Year</th>

                <th>Month</th>

                <th>House</th>

                <th>Tenant</th>

                <th>Unit</th>

                <th className="text-right">Total</th>

                <th className="text-right">Payment</th>

                <th className="text-right">Due / Advance</th>

                <th className="text-center">Adjust</th>

                <th className="text-center">Print</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center">
                    Loading monthly bills...
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center">
                    No monthly bills found for this month.
                  </td>
                </tr>
              ) : (
                bills.map((bill) => (
                  <tr key={bill.monthly_bill_id}>
                    <td>{year}</td>

                    <td>{getMonthName(month)}</td>

                    <td>{bill.house_name}</td>

                    <td>
                      <strong>{bill.tenant_name}</strong>

                      {bill.tenant_phone && (
                        <div className="table-subtext">{bill.tenant_phone}</div>
                      )}
                    </td>

                    <td>{bill.property_unit_name}</td>

                    {/* TOTAL */}

                    <td className="text-right">
                      <button
                        type="button"
                        className="table-link"
                        onClick={() => handleTotalClick(bill)}
                      >
                        {formatMoney(bill.total_amount)}
                      </button>
                    </td>

                    {/* PAYMENT */}

                    <td className="text-right">
                      <button
                        type="button"
                        className="table-link"
                        onClick={() => handlePaymentClick(bill)}
                      >
                        {formatMoney(bill.month_payment)}
                      </button>
                    </td>

                    {/* DUE / ADVANCE */}

                    <td className="text-right">
                      {bill.balance_type === "due" && (
                        <span className="balance-due">
                          Due&nbsp;
                          {formatMoney(bill.balance_amount)}
                        </span>
                      )}

                      {bill.balance_type === "advance" && (
                        <span className="balance-advance">
                          Advance&nbsp;
                          {formatMoney(bill.balance_amount)}
                        </span>
                      )}

                      {bill.balance_type === "settled" && (
                        <span className="balance-settled">Settled</span>
                      )}
                    </td>

                    {/* ADJUST */}

                    <td className="text-center">
                      <button
                        type="button"
                        className="bill-adjust-btn"
                        title="Adjust Bill"
                        onClick={() => handleAdjustClick(bill)}
                      >
                        Adjust
                      </button>
                    </td>

                    {/* PRINT */}

                    <td className="text-center">
                      <button
                        type="button"
                        className="bill-print-btn"
                        title="Print Bill"
                        onClick={() => handlePrint(bill)}
                      >
                        <Printer size={17} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* =====================================
                    SUMMARY
                ===================================== */}

        {!loading && bills.length > 0 && (
          <div className="bill-register-summary">
            <ReceiptText size={18} />

            <span>
              Total Bills: <strong>{bills.length}</strong>
            </span>
          </div>
        )}
      </div>

      {/* =========================================
                BILL DETAILS MODAL
            ========================================= */}

      {detailOpen && (
        <div
          className="bill-modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0, 0, 0, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onMouseDown={closeDetailModal}
        >
          <div
            className="bill-detail-modal"
            style={{
              width: "680px",
              maxWidth: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              background: "#ffffff",
              color: "#0f172a",
              borderRadius: "12px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {/* HEADER */}

            <div className="bill-modal-header">
              <div>
                <h2>Monthly Bill Details</h2>

                {billDetail && <p>{billDetail.billing_month}</p>}
              </div>

              <button
                type="button"
                className="bill-modal-close"
                onClick={closeDetailModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* BODY */}

            <div className="bill-modal-body">
              {detailLoading ? (
                <div className="bill-modal-message">
                  Loading bill details...
                </div>
              ) : detailError ? (
                <div className="alert alert-danger">{detailError}</div>
              ) : billDetail ? (
                <>
                  {/* TENANT / PROPERTY */}

                  <div className="bill-info-grid">
                    <div>
                      <span className="bill-info-label">Tenant</span>

                      <strong>{billDetail.tenant.name}</strong>

                      <small>{billDetail.tenant.phone || "-"}</small>
                    </div>

                    <div>
                      <span className="bill-info-label">House</span>

                      <strong>{billDetail.house.name}</strong>

                      <small>{billDetail.house.address || "-"}</small>
                    </div>

                    <div>
                      <span className="bill-info-label">Unit</span>

                      <strong>{billDetail.property_unit.name}</strong>
                    </div>

                    <div>
                      <span className="bill-info-label">Due Date</span>

                      <strong>{billDetail.due_date || "-"}</strong>
                    </div>
                  </div>

                  {/* CHARGE BREAKDOWN */}

                  <div className="bill-detail-section">
                    <h3>Charge Breakdown</h3>

                    <div className="bill-charge-table">
                      <div className="bill-charge-head">
                        <span>Billing Item</span>

                        <span>Amount</span>
                      </div>

                      {billDetail.items.map((item) => (
                        <div className="bill-charge-row" key={item.id}>
                          <span>{item.name}</span>

                          <strong>{formatMoney(item.amount)}</strong>
                        </div>
                      ))}

                      <div className="bill-charge-total">
                        <span>Current Bill Total</span>

                        <strong>{formatMoney(billDetail.total_amount)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* BALANCE SUMMARY */}

                  <div className="bill-detail-section">
                    <h3>Balance Summary</h3>

                    <div className="bill-balance-summary">
                      <div>
                        <span>Previous Balance</span>

                        <strong>
                          {formatMoney(billDetail.previous_balance)}
                        </strong>
                      </div>

                      <div>
                        <span>Current Bill</span>

                        <strong>{formatMoney(billDetail.total_amount)}</strong>
                      </div>

                      <div>
                        <span>Net Payment</span>

                        <strong>{formatMoney(billDetail.month_payment)}</strong>
                      </div>

                      <div className="bill-closing-balance">
                        <span>Closing Balance</span>

                        {billDetail.balance_type === "due" && (
                          <strong className="balance-due">
                            Due&nbsp;
                            {formatMoney(billDetail.balance_amount)}
                          </strong>
                        )}

                        {billDetail.balance_type === "advance" && (
                          <strong className="balance-advance">
                            Advance&nbsp;
                            {formatMoney(billDetail.balance_amount)}
                          </strong>
                        )}

                        {billDetail.balance_type === "settled" && (
                          <strong className="balance-settled">Settled</strong>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* FOOTER */}

            <div className="bill-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeDetailModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
                ADJUST MONTHLY BILL MODAL
            ========================================= */}

      {adjustOpen && (
        <div
          className="bill-modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0, 0, 0, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onMouseDown={closeAdjustModal}
        >
          <div
            className="bill-detail-modal"
            style={{
              width: "680px",
              maxWidth: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              background: "#ffffff",
              color: "#0f172a",
              borderRadius: "12px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.25)",
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {/* =====================================
                            HEADER
                        ===================================== */}

            <div className="bill-modal-header">
              <div>
                <h2>Adjust Monthly Bill</h2>

                {adjustBill && <p>{adjustBill.billing_month}</p>}
              </div>

              <button
                type="button"
                className="bill-modal-close"
                onClick={closeAdjustModal}
                disabled={adjustSaving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* =====================================
                            BODY
                        ===================================== */}

            <div className="bill-modal-body">
              {adjustLoading ? (
                <div className="bill-modal-message">Loading bill...</div>
              ) : adjustError && !adjustBill ? (
                <div className="alert alert-danger">{adjustError}</div>
              ) : adjustBill ? (
                <>
                  {/* =========================
                                        BILL INFORMATION
                                    ========================= */}

                  <div className="bill-info-grid">
                    <div>
                      <span className="bill-info-label">Tenant</span>

                      <strong>{adjustBill.tenant?.name}</strong>
                    </div>

                    <div>
                      <span className="bill-info-label">House</span>

                      <strong>{adjustBill.house?.name}</strong>
                    </div>

                    <div>
                      <span className="bill-info-label">Unit</span>

                      <strong>{adjustBill.property_unit?.name}</strong>
                    </div>

                    <div>
                      <span className="bill-info-label">Current Total</span>

                      <strong>{formatMoney(adjustBill.total_amount)}</strong>
                    </div>
                  </div>

                  {/* =========================
                                        ADJUSTMENT FORM
                                    ========================= */}

                  <form onSubmit={handleAdjustSave}>
                    {adjustError && (
                      <div
                        className="alert alert-danger"
                        style={{
                          marginTop: "16px",
                        }}
                      >
                        {adjustError}
                      </div>
                    )}

                    {/* =====================
                                            BILL ITEMS
                                        ===================== */}

                    <div className="bill-detail-section">
                      <h3>Bill Items</h3>

                      <div className="adjust-bill-items">
                        {adjustItems.map((item) => (
                          <div className="adjust-bill-row" key={item.id}>
                            <div>
                              <strong>{item.name}</strong>

                              <small>
                                Previous: {formatMoney(item.original_amount)}
                              </small>
                            </div>

                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.amount}
                              onChange={(event) =>
                                handleAdjustAmountChange(
                                  item.billing_item_id,
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>

                      <div className="adjust-total">
                        <span>New Total</span>

                        <strong>{formatMoney(getAdjustedTotal())}</strong>
                      </div>
                    </div>

                    {/* =====================
                                            ADJUSTMENT REASON
                                        ===================== */}

                    <div className="payment-field">
                      <label>Adjustment Reason</label>

                      <textarea
                        rows="3"
                        maxLength="255"
                        value={adjustReason}
                        onChange={(event) =>
                          setAdjustReason(event.target.value)
                        }
                        placeholder="Enter reason for this adjustment"
                      />
                    </div>

                    {/* =====================
                                            ACTION BUTTONS
                                        ===================== */}

                    <div
                      className="payment-form-actions"
                      style={{
                        marginTop: "20px",
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={closeAdjustModal}
                        disabled={adjustSaving}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={adjustSaving}
                      >
                        {adjustSaving ? "Saving..." : "Save Adjustment"}
                      </button>
                    </div>
                  </form>

                  {/* =========================
                                        ADJUSTMENT HISTORY
                                    ========================= */}

                  <div className="bill-detail-section">
                    <h3>Adjustment History</h3>

                    {adjustmentHistory.length === 0 ? (
                      <div className="adjustment-history-empty">
                        No previous adjustments found.
                      </div>
                    ) : (
                      <div className="adjustment-history-list">
                        {adjustmentHistory.map((adjustment) => (
                          <div
                            className="adjustment-history-item"
                            key={adjustment.id}
                          >
                            {/* HISTORY HEADER */}

                            <div className="adjustment-history-header">
                              <strong>{adjustment.billing_item_name}</strong>

                              <span>
                                {formatDateTime(adjustment.created_at)}
                              </span>
                            </div>

                            {/* OLD -> NEW */}

                            <div className="adjustment-history-change">
                              <span>{formatMoney(adjustment.old_amount)}</span>

                              <strong>→</strong>

                              <span>{formatMoney(adjustment.new_amount)}</span>
                            </div>

                            {/* REASON */}

                            <div className="adjustment-history-reason">
                              <strong>Reason:</strong> {adjustment.reason}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* =========================================
                PAYMENT MODAL
            ========================================= */}

      {paymentOpen && selectedBill && (
        <div className="payment-modal-overlay" onMouseDown={closePaymentModal}>
          <div
            className="payment-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {/* HEADER */}

            <div className="payment-modal-header">
              <div>
                <h2>Payment</h2>

                <p>
                  {getMonthName(month)} {year}
                </p>
              </div>

              <button
                type="button"
                className="payment-modal-close"
                onClick={closePaymentModal}
              >
                ×
              </button>
            </div>

            <div className="payment-modal-body">
              {/* TENANT INFORMATION */}

              <div className="payment-info-grid">
                <div>
                  <span>House</span>

                  <strong>{selectedBill.house_name}</strong>
                </div>

                <div>
                  <span>Tenant</span>

                  <strong>{selectedBill.tenant_name}</strong>
                </div>

                <div>
                  <span>Unit</span>

                  <strong>{selectedBill.property_unit_name}</strong>
                </div>

                <div>
                  <span>Balance</span>

                  {selectedBill.balance_type === "due" && (
                    <strong className="balance-due">
                      Due {formatMoney(selectedBill.balance_amount)}
                    </strong>
                  )}

                  {selectedBill.balance_type === "advance" && (
                    <strong className="balance-advance">
                      Advance {formatMoney(selectedBill.balance_amount)}
                    </strong>
                  )}

                  {selectedBill.balance_type === "settled" && (
                    <strong className="balance-settled">Settled</strong>
                  )}
                </div>
              </div>

              {/* CURRENT TENANCY LEDGER BALANCE */}

              {tenancyBalance && (
                <div className="payment-balance-summary">
                  <div>
                    <span>Total Billed</span>

                    <strong>{formatMoney(tenancyBalance.total_billed)}</strong>
                  </div>

                  <div>
                    <span>Total Added</span>

                    <strong>{formatMoney(tenancyBalance.total_added)}</strong>
                  </div>

                  <div>
                    <span>Total Returned</span>

                    <strong>
                      {formatMoney(tenancyBalance.total_returned)}
                    </strong>
                  </div>

                  <div>
                    <span>Net Payment</span>

                    <strong>{formatMoney(tenancyBalance.net_payment)}</strong>
                  </div>

                  <div className="payment-balance-total">
                    <span>
                      {tenancyBalance.balance_type === "advance"
                        ? "Current Advance"
                        : tenancyBalance.balance_type === "settled"
                          ? "Current Balance"
                          : "Current Due"}
                    </span>

                    <strong
                      className={
                        tenancyBalance.balance_type === "due"
                          ? "balance-due"
                          : tenancyBalance.balance_type === "advance"
                            ? "balance-advance"
                            : "balance-settled"
                      }
                    >
                      {tenancyBalance.balance_type === "settled"
                        ? "Settled"
                        : formatMoney(tenancyBalance.display_amount)}
                    </strong>
                  </div>
                </div>
              )}

              {/* MESSAGES */}

              {paymentError && (
                <div className="alert alert-danger">{paymentError}</div>
              )}

              {paymentSuccess && (
                <div className="payment-success">{paymentSuccess}</div>
              )}

              {/* PAYMENT FORM */}

              <form onSubmit={handlePaymentSave} className="payment-form">
                <div className="payment-form-grid">
                  <div className="payment-field">
                    <label>Payment Type</label>

                    <select
                      name="payment_type"
                      value={paymentForm.payment_type}
                      onChange={handlePaymentFormChange}
                    >
                      <option value="add">Add Payment</option>

                      <option value="return">Return</option>
                    </select>
                  </div>

                  <div className="payment-field">
                    <label>Amount</label>

                    <input
                      type="number"
                      name="amount"
                      min="0.01"
                      step="0.01"
                      value={paymentForm.amount}
                      onChange={handlePaymentFormChange}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="payment-field">
                    <label>Payment Date</label>

                    <input
                      type="datetime-local"
                      name="payment_date"
                      value={paymentForm.payment_date}
                      max={getMaxPaymentDateTime()}
                      onChange={handlePaymentFormChange}
                    />
                  </div>

                  <div className="payment-field">
                    <label>Reference No.</label>

                    <input
                      type="text"
                      name="reference_no"
                      value={paymentForm.reference_no}
                      onChange={handlePaymentFormChange}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="payment-field">
                  <label>Note</label>

                  <textarea
                    name="note"
                    rows="2"
                    value={paymentForm.note}
                    onChange={handlePaymentFormChange}
                    placeholder="Optional note"
                  />
                </div>

                <div className="payment-form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closePaymentModal}
                    disabled={paymentSaving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={paymentSaving}
                  >
                    {paymentSaving
                      ? "Saving..."
                      : paymentForm.payment_type === "return"
                        ? "Save Return"
                        : "Save Payment"}
                  </button>
                </div>
              </form>

              {/* PAYMENT HISTORY */}

              <div className="payment-history">
                <h3>Payment History</h3>

                {paymentLoading ? (
                  <div className="payment-history-message">
                    Loading payment history...
                  </div>
                ) : paymentHistory.length === 0 ? (
                  <div className="payment-history-message">
                    No payment history found.
                  </div>
                ) : (
                  <div className="payment-history-table-wrap">
                    <table className="payment-history-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>

                          <th className="text-right">Amount</th>

                          <th>Reference</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {paymentHistory.map((payment) => (
                          <tr
                            key={payment.id}
                            className={
                              payment.is_void ? "payment-void-row" : ""
                            }
                          >
                            <td>{formatDateTime(payment.payment_date)}</td>

                            <td>
                              {payment.payment_type === "add" ? (
                                <span className="payment-type-add">ADD</span>
                              ) : (
                                <span className="payment-type-return">
                                  RETURN
                                </span>
                              )}
                            </td>

                            <td className="text-right">
                              <strong>{formatMoney(payment.amount)}</strong>
                            </td>

                            <td>{payment.reference_no || "-"}</td>

                            {/* STATUS */}

                            <td>
                              {payment.is_void ? (
                                <div>
                                  <span className="payment-status-void">
                                    VOID
                                  </span>

                                  {payment.void_reason && (
                                    <div className="payment-void-reason">
                                      {payment.void_reason}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="payment-status-active">
                                  Active
                                </span>
                              )}
                            </td>

                            {/* ACTION */}

                            <td>
                              {payment.is_void ? (
                                <span className="payment-void-text">—</span>
                              ) : (
                                <button
                                  type="button"
                                  className="payment-void-btn"
                                  disabled={
                                    voidSaving && voidPaymentId === payment.id
                                  }
                                  onClick={() => handleVoidPayment(payment)}
                                >
                                  {voidSaving && voidPaymentId === payment.id
                                    ? "Voiding..."
                                    : "Void"}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
    PAYMENT VOID HISTORY MODAL
========================================= */}

      {voidHistoryOpen && (
        <div
          className="payment-modal-overlay"
          onMouseDown={handleCloseVoidHistory}
        >
          <div
            className="payment-modal void-history-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="payment-modal-header">
              <div>
                <h2>Payment Void History</h2>
                <p>Audit trail of cancelled payments</p>
              </div>

              <button
                type="button"
                className="payment-modal-close"
                onClick={handleCloseVoidHistory}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="payment-modal-body">
              {voidHistoryError && (
                <div className="alert alert-danger">{voidHistoryError}</div>
              )}

              {voidHistoryLoading ? (
                <div className="payment-history-message">
                  Loading void history...
                </div>
              ) : !voidHistoryError && voidHistory.length === 0 ? (
                <div className="payment-history-message">
                  No void payments found.
                </div>
              ) : (
                !voidHistoryError && (
                  <>
                    <p className="void-history-count">
                      Total Void Payments: <strong>{voidHistory.length}</strong>
                    </p>

                    <div className="payment-history-table-wrap">
                      <table className="payment-history-table">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Reference</th>
                            <th>Tenant</th>
                            <th>House / Unit</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Payment Date</th>
                            <th>Void Date</th>
                            <th>Void Reason</th>
                            <th>Void By</th>
                          </tr>
                        </thead>

                        <tbody>
                          {voidHistory.map((payment) => (
                            <tr key={payment.id}>
                              <td>{payment.id}</td>

                              <td>{payment.reference_no || "-"}</td>

                              <td>{payment.tenant_name || "-"}</td>

                              <td>
                                {payment.house_name || "-"}
                                <div className="table-subtext">
                                  {payment.property_unit_name || "-"}
                                </div>
                              </td>

                              <td>
                                {payment.payment_type === "return"
                                  ? "RETURN"
                                  : "ADD"}
                              </td>

                              <td className="text-right">
                                {formatMoney(payment.amount)}
                              </td>

                              <td>{formatDateTime(payment.payment_date)}</td>

                              <td>{formatDateTime(payment.voided_at)}</td>

                              <td>{payment.void_reason || "-"}</td>

                              <td>
                                {payment.voided_by_name || "Not recorded"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )
              )}
            </div>

            <div className="bill-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCloseVoidHistory}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MonthlyBills;
