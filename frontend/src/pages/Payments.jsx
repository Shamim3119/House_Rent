import { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  Printer,
  Search,
  RefreshCw,
  Plus,
  Ban,
  History,
} from "lucide-react";
import api from "../api/axios";
import "./Payments.css";

const money = (value) =>
  Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const dateText = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
};
const dateKey = (value) => {
  if (!value) return "";
  // MySQL dates usually arrive as ISO timestamps; compare their calendar date.
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const escapeHtml = (value) =>
  String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [houseId, setHouseId] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("active");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [printingId, setPrintingId] = useState(null);
  const [tenancies, setTenancies] = useState([]);
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryHouse, setEntryHouse] = useState("");
  const [entryTenancy, setEntryTenancy] = useState("");
  const [entryType, setEntryType] = useState("add");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryDate, setEntryDate] = useState(() =>
    new Date().toLocaleDateString("en-CA"),
  );
  const [entryReference, setEntryReference] = useState("");
  const [entryNote, setEntryNote] = useState("");
  const [entryBalance, setEntryBalance] = useState(null);
  const [entryError, setEntryError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingLock = useRef(false);
  const requestIdentity = useRef(null);
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidError, setVoidError] = useState("");
  const [voidSaving, setVoidSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [voidHistory, setVoidHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadPayments = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/payments");
      setPayments(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (err) {
      setPayments([]);
      setError(err.response?.data?.message || "Failed to load payments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const loadTenancies = async () => {
    try {
      const response = await api.get("/tenancies");
      setTenancies(
        Array.isArray(response.data?.data) ? response.data.data : [],
      );
    } catch (err) {
      setEntryError(err.response?.data?.message || "Failed to load tenancies.");
    }
  };

  const openEntry = async () => {
    requestIdentity.current = null;
    setEntryError("");
    setEntryHouse("");
    setEntryTenancy("");
    setEntryBalance(null);
    setEntryType("add");
    setEntryAmount("");
    setEntryReference("");
    setEntryNote("");
    setEntryDate(new Date().toLocaleDateString("en-CA"));
    setEntryOpen(true);
    await loadTenancies();
  };

  useEffect(() => {
    if (!entryTenancy) {
      setEntryBalance(null);
      return;
    }
    let cancelled = false;
    setEntryBalance(null);
    api
      .get(`/payments/tenancy/${entryTenancy}/balance`)
      .then((r) => {
        if (!cancelled) setEntryBalance(r.data?.data || null);
      })
      .catch(() => {
        if (!cancelled) setEntryBalance({ unavailable: true });
      });
    return () => {
      cancelled = true;
    };
  }, [entryTenancy]);

  const submitEntry = async (event) => {
    event.preventDefault();
    if (savingLock.current) return;
    setEntryError("");
    const amount = Number(entryAmount);
    if (
      !entryTenancy ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !entryDate
    ) {
      setEntryError("Select a tenancy, valid amount and payment date.");
      return;
    }
    const tenancy = tenancies.find(
      (t) => String(t.id) === String(entryTenancy),
    );
    if (!tenancy || tenancy.status !== "active") {
      setEntryError("Select an active tenancy.");
      return;
    }
    if (entryDate < dateKey(tenancy.start_date)) {
      setEntryError("Payment date cannot be before tenancy start date.");
      return;
    }
    const payload = {
      tenancy_id: Number(entryTenancy),
      payment_type: entryType,
      amount,
      payment_date: entryDate,
      reference_no: entryReference,
      note: entryNote,
    };
    const signature = JSON.stringify(payload);
    // Same unchanged form = same key on retry; edited form = new operation.
    if (
      !requestIdentity.current ||
      requestIdentity.current.signature !== signature
    ) {
      requestIdentity.current = { signature, key: crypto.randomUUID() };
    }
    savingLock.current = true;
    setSaving(true);
    try {
      const response = await api.post("/payments", {
        ...payload,
        idempotency_key: requestIdentity.current.key,
      });
      if (response.data?.success === false)
        throw new Error(response.data?.message || "Payment failed.");
      requestIdentity.current = null;
      setEntryOpen(false);
      await loadPayments();
    } catch (err) {
      setEntryError(err.response?.data?.message || "Failed to save payment.");
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  };

  const submitVoid = async (event) => {
    event.preventDefault();
    if (!voidReason.trim() || voidReason.trim().length > 255) {
      setVoidError("Void reason must be between 1 and 255 characters.");
      return;
    }
    setVoidSaving(true);
    setVoidError("");
    try {
      await api.put(`/payments/${voidTarget.id}/void`, {
        void_reason: voidReason.trim(),
      });
      setVoidTarget(null);
      setVoidReason("");
      await loadPayments();
    } catch (err) {
      setVoidError(err.response?.data?.message || "Failed to void payment.");
    } finally {
      setVoidSaving(false);
    }
  };

  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const response = await api.get("/payments/void-history");
      setVoidHistory(
        Array.isArray(response.data?.data) ? response.data.data : [],
      );
    } catch (err) {
      setHistoryError(
        err.response?.data?.message || "Failed to load void history.",
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  const entryHouses = useMemo(() => {
    const map = new Map();
    tenancies.forEach((t) => {
      if (t.house_id != null) map.set(String(t.house_id), t.house_name);
    });
    return [...map]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [tenancies]);
  const entryTenancies = useMemo(
    () =>
      tenancies.filter(
        (t) =>
          t.status === "active" &&
          (!entryHouse || String(t.house_id) === entryHouse),
      ),
    [tenancies, entryHouse],
  );

  const houses = useMemo(() => {
    const map = new Map();
    payments.forEach((p) => {
      if (p.house_id != null) map.set(String(p.house_id), p.house_name);
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      String(a.name).localeCompare(String(b.name)),
    );
  }, [payments]);

  const filtered = useMemo(
    () =>
      payments.filter((p) => {
        const haystack = [
          p.id,
          p.tenant_name,
          p.tenant_phone,
          p.house_name,
          p.property_unit_name,
          p.reference_no,
        ]
          .map((v) => String(v ?? "").toLowerCase())
          .join(" ");
        const d = dateKey(p.payment_date);
        return (
          (!query.trim() || haystack.includes(query.trim().toLowerCase())) &&
          (!houseId || String(p.house_id) === houseId) &&
          (type === "all" || p.payment_type === type) &&
          (status === "all" ||
            (status === "void" ? Boolean(p.is_void) : !p.is_void)) &&
          (!fromDate || d >= fromDate) &&
          (!toDate || d <= toDate)
        );
      }),
    [payments, query, houseId, type, status, fromDate, toDate],
  );

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, p) => {
          if (!p.is_void) {
            if (p.payment_type === "add") acc.added += Number(p.amount || 0);
            if (p.payment_type === "return")
              acc.returned += Number(p.amount || 0);
          }
          return acc;
        },
        { added: 0, returned: 0 },
      ),
    [filtered],
  );

  const fetchPayment = async (id) => {
    const response = await api.get(`/payments/${id}`);
    if (!response.data?.data) throw new Error("Payment details not found.");
    return response.data.data;
  };

  const showDetail = async (id) => {
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      setDetail(await fetchPayment(id));
    } catch (err) {
      setDetailError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load payment details.",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const printReceipt = async (id) => {
    // Open synchronously on click to avoid browser popup blockers.
    const popup = window.open("", "_blank", "width=850,height=850");
    if (!popup) {
      setError("Please allow pop-ups to print a receipt.");
      return;
    }
    popup.document.write(
      "<p style='font-family:Arial;padding:25px'>Preparing receipt...</p>",
    );
    popup.document.close();
    setPrintingId(id);
    setError("");
    try {
      const p = await fetchPayment(id);
      const isReturn = p.payment_type === "return";
      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${isReturn ? "Return Voucher" : "Payment Receipt"} #${escapeHtml(p.id)}</title>
      <style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;margin:0;padding:30px;background:#f3f4f6}.actions{text-align:right;max-width:740px;margin:0 auto 16px}.actions button{padding:10px 18px;cursor:pointer}.receipt{max-width:740px;margin:auto;background:white;border:1px solid #d1d5db;padding:36px;position:relative}.heading{text-align:center;border-bottom:2px solid #111827;padding-bottom:18px}.heading h1{margin:0 0 7px;font-size:25px}.heading h2{margin:0;font-size:19px}.heading p{margin:8px 0 0}.info{width:100%;border-collapse:collapse;margin-top:25px}.info td{padding:9px 5px;border-bottom:1px solid #e5e7eb;vertical-align:top}.info td:first-child{width:35%;font-weight:bold}.amount{margin:28px 0;padding:20px;background:#f3f4f6;text-align:center;font-size:22px;font-weight:bold}.note{margin-top:20px;font-size:13px}.foot{margin-top:60px;display:flex;justify-content:space-between;gap:20px}.foot span{border-top:1px solid #111;padding-top:9px;min-width:150px;text-align:center}.void{position:absolute;top:46%;left:25%;font-size:80px;font-weight:bold;color:rgba(185,28,28,.23);transform:rotate(-24deg);pointer-events:none}@media print{body{padding:0;background:white}.actions{display:none}.receipt{border:0;max-width:none}}</style></head><body>
      <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div><div class="receipt">${p.is_void ? '<div class="void">VOID</div>' : ""}
      <div class="heading"><h1>${escapeHtml(p.house_name)}</h1><h2>${isReturn ? "Payment Return Voucher" : "Payment Receipt"}</h2><p>${p.is_void ? "VOID — NOT VALID" : "Transaction Record"}</p></div>
      <table class="info"><tr><td>Receipt / Voucher No.</td><td>${isReturn ? "RET" : "PAY"}-${escapeHtml(p.id)}</td></tr><tr><td>Payment Date</td><td>${escapeHtml(dateText(p.payment_date))}</td></tr><tr><td>Tenant</td><td>${escapeHtml(p.tenant_name)}</td></tr><tr><td>Phone</td><td>${escapeHtml(p.tenant_phone)}</td></tr><tr><td>House</td><td>${escapeHtml(p.house_name)}</td></tr><tr><td>Unit</td><td>${escapeHtml(p.property_unit_name)}</td></tr><tr><td>Transaction Type</td><td>${isReturn ? "Return to Tenant" : "Payment Received"}</td></tr><tr><td>Reference No.</td><td>${escapeHtml(p.reference_no)}</td></tr><tr><td>Status</td><td>${p.is_void ? "VOID" : "Active"}</td></tr></table>
      <div class="amount">${isReturn ? "Amount Returned" : "Amount Received"}: BDT ${money(p.amount)}</div>
      ${p.note ? `<div class="note"><b>Note:</b> ${escapeHtml(p.note)}</div>` : ""}
      ${p.is_void ? `<div class="note"><b>Void Reason:</b> ${escapeHtml(p.void_reason)}</div>` : ""}
      <div class="foot"><span>Received / Issued By</span><span>Tenant Signature</span></div></div></body></html>`;
      if (!popup.closed) {
        popup.document.open();
        popup.document.write(html);
        popup.document.close();
        popup.focus();
      }
    } catch (err) {
      if (!popup.closed) popup.close();
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to prepare receipt.",
      );
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <div className="page-container payments-page">
      <div className="page-header">
        <div>
          <h1>Payments</h1>
          <p>Payment register, transaction details and receipt printing.</p>
        </div>
        <div className="payments-header-actions">
          <button className="btn btn-primary" type="button" onClick={openEntry}>
            <Plus size={16} /> New Payment
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={openHistory}
          >
            <History size={16} /> Void History
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={loadPayments}
            disabled={loading}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="payments-summary">
        <div className="card">
          <span>Total Received</span>
          <strong>৳ {money(totals.added)}</strong>
        </div>
        <div className="card">
          <span>Total Returned</span>
          <strong>৳ {money(totals.returned)}</strong>
        </div>
        <div className="card">
          <span>Net Collection</span>
          <strong>৳ {money(totals.added - totals.returned)}</strong>
        </div>
      </div>
      <div className="card payments-filters">
        <label>
          Search
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tenant, reference, payment ID..."
          />
        </label>
        <label>
          House
          <select value={houseId} onChange={(e) => setHouseId(e.target.value)}>
            <option value="">All Houses</option>
            {houses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="add">Add</option>
            <option value="return">Return</option>
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="void">Void</option>
            <option value="all">All</option>
          </select>
        </label>
        <label>
          From
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => setToDate(e.target.value)}
          />
        </label>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => {
            setQuery("");
            setHouseId("");
            setType("all");
            setStatus("active");
            setFromDate("");
            setToDate("");
          }}
        >
          <Search size={16} /> Clear Filters
        </button>
      </div>
      <div className="card">
        <div className="payments-register-heading">
          <h2>Payment Register</h2>
          <span>{filtered.length} transaction(s)</span>
        </div>
        <div className="table-responsive">
          <table className="data-table payments-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Tenant</th>
                <th>House / Unit</th>
                <th>Type</th>
                <th className="text-right">Amount</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center">
                    Loading payments...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center">
                    No payments found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{dateText(p.payment_date)}</td>
                    <td>
                      <strong>{p.tenant_name}</strong>
                      <div className="table-subtext">
                        {p.tenant_phone || ""}
                      </div>
                    </td>
                    <td>
                      {p.house_name}
                      <div className="table-subtext">
                        {p.property_unit_name}
                      </div>
                    </td>
                    <td>{p.payment_type === "return" ? "RETURN" : "ADD"}</td>
                    <td className="text-right">{money(p.amount)}</td>
                    <td>{p.reference_no || "-"}</td>
                    <td>
                      {p.is_void ? (
                        <span className="payments-void">VOID</span>
                      ) : (
                        <span className="payments-active">Active</span>
                      )}
                    </td>
                    <td>
                      <div className="payments-actions">
                        <button
                          type="button"
                          title="View details"
                          onClick={() => showDetail(p.id)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          title="Print receipt"
                          disabled={printingId === p.id}
                          onClick={() => printReceipt(p.id)}
                        >
                          <Printer size={16} />
                        </button>
                        {!p.is_void && (
                          <button
                            type="button"
                            title="Void payment"
                            onClick={() => {
                              setVoidTarget(p);
                              setVoidReason("");
                              setVoidError("");
                            }}
                          >
                            <Ban size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {entryOpen && (
        <div
          className="payments-modal-overlay"
          onMouseDown={() => !saving && setEntryOpen(false)}
        >
          <div
            className="payments-modal card"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="payments-modal-header">
              <h2>New Payment</h2>
              <button
                type="button"
                onClick={() => setEntryOpen(false)}
                disabled={saving}
              >
                ×
              </button>
            </div>
            {entryError && (
              <div className="alert alert-danger">{entryError}</div>
            )}
            <form className="payments-entry-form" onSubmit={submitEntry}>
              <label>
                House
                <select
                  value={entryHouse}
                  onChange={(e) => {
                    setEntryHouse(e.target.value);
                    setEntryTenancy("");
                  }}
                >
                  <option value="">All Houses</option>
                  {entryHouses.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tenancy *
                <select
                  required
                  value={entryTenancy}
                  onChange={(e) => setEntryTenancy(e.target.value)}
                >
                  <option value="">Select Tenancy</option>
                  {entryTenancies.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.tenant_name} — {t.house_name} / {t.property_unit_name}{" "}
                      (#{t.id})
                    </option>
                  ))}
                </select>
              </label>
              {entryTenancy && (
                <div className="payments-balance-box">
                  Current Balance:{" "}
                  {entryBalance === null
                    ? "Loading..."
                    : entryBalance.unavailable
                      ? "Unavailable"
                      : `${entryBalance.balance_type === "advance" ? "Advance" : entryBalance.balance_type === "due" ? "Due" : "Settled"} — ৳ ${money(entryBalance.display_amount)}`}
                </div>
              )}
              <label>
                Transaction Type *
                <select
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value)}
                >
                  <option value="add">Add Payment (Received)</option>
                  <option value="return">
                    Return Payment (Paid to Tenant)
                  </option>
                </select>
              </label>
              <label>
                Amount (BDT) *
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                />
              </label>
              <label>
                Payment Date *
                <input
                  type="date"
                  required
                  value={entryDate}
                  max={new Date().toLocaleDateString("en-CA")}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </label>
              <label>
                Reference No.
                <input
                  value={entryReference}
                  maxLength={255}
                  onChange={(e) => setEntryReference(e.target.value)}
                />
              </label>
              <label>
                Note
                <textarea
                  rows={3}
                  value={entryNote}
                  onChange={(e) => setEntryNote(e.target.value)}
                />
              </label>
              <div className="payments-form-actions">
                <button
                  className="btn btn-secondary"
                  type="button"
                  disabled={saving}
                  onClick={() => setEntryOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={saving || !entryTenancy}
                >
                  {saving ? "Saving..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {voidTarget && (
        <div
          className="payments-modal-overlay"
          onMouseDown={() => !voidSaving && setVoidTarget(null)}
        >
          <div
            className="payments-modal card"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="payments-modal-header">
              <h2>Void Payment #{voidTarget.id}</h2>
              <button
                type="button"
                disabled={voidSaving}
                onClick={() => setVoidTarget(null)}
              >
                ×
              </button>
            </div>
            <p>
              This will exclude the payment from financial balances. The record
              will remain in audit history.
            </p>
            <p>
              <strong>{voidTarget.tenant_name}</strong> — ৳{" "}
              {money(voidTarget.amount)}
            </p>
            {voidError && <div className="alert alert-danger">{voidError}</div>}
            <form className="payments-entry-form" onSubmit={submitVoid}>
              <label>
                Void Reason *
                <textarea
                  required
                  maxLength={255}
                  rows={3}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                />
              </label>
              <div className="payments-form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={voidSaving}
                  onClick={() => setVoidTarget(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={voidSaving || !voidReason.trim()}
                >
                  {voidSaving ? "Voiding..." : "Confirm Void"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {historyOpen && (
        <div
          className="payments-modal-overlay"
          onMouseDown={() => setHistoryOpen(false)}
        >
          <div
            className="payments-modal card payments-history-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="payments-modal-header">
              <h2>Void History</h2>
              <button type="button" onClick={() => setHistoryOpen(false)}>
                ×
              </button>
            </div>
            {historyError && (
              <div className="alert alert-danger">{historyError}</div>
            )}
            {historyLoading ? (
              <p>Loading...</p>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tenant</th>
                      <th>Amount</th>
                      <th>Voided At</th>
                      <th>Voided By</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voidHistory.length === 0 ? (
                      <tr>
                        <td colSpan="6">No void records.</td>
                      </tr>
                    ) : (
                      voidHistory.map((p) => (
                        <tr key={p.id}>
                          <td>{p.id}</td>
                          <td>{p.tenant_name}</td>
                          <td>৳ {money(p.amount)}</td>
                          <td>{dateText(p.voided_at)}</td>
                          <td>{p.voided_by_name || p.voided_by || "-"}</td>
                          <td>{p.void_reason}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {(detailLoading || detail || detailError) && (
        <div
          className="payments-modal-overlay"
          onMouseDown={() => {
            if (!detailLoading) {
              setDetail(null);
              setDetailError("");
            }
          }}
        >
          <div
            className="payments-modal card"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="payments-modal-header">
              <h2>Payment Details</h2>
              <button
                type="button"
                onClick={() => {
                  setDetail(null);
                  setDetailError("");
                }}
              >
                ×
              </button>
            </div>
            {detailLoading ? (
              <p>Loading...</p>
            ) : detailError ? (
              <div className="alert alert-danger">{detailError}</div>
            ) : (
              detail && (
                <>
                  <dl>
                    <dt>Payment ID</dt>
                    <dd>{detail.id}</dd>
                    <dt>Tenant</dt>
                    <dd>{detail.tenant_name}</dd>
                    <dt>House / Unit</dt>
                    <dd>
                      {detail.house_name} / {detail.property_unit_name}
                    </dd>
                    <dt>Date</dt>
                    <dd>{dateText(detail.payment_date)}</dd>
                    <dt>Type</dt>
                    <dd>
                      {detail.payment_type === "return" ? "Return" : "Add"}
                    </dd>
                    <dt>Amount</dt>
                    <dd>৳ {money(detail.amount)}</dd>
                    <dt>Reference</dt>
                    <dd>{detail.reference_no || "-"}</dd>
                    <dt>Note</dt>
                    <dd>{detail.note || "-"}</dd>
                    <dt>Status</dt>
                    <dd>{detail.is_void ? "VOID" : "Active"}</dd>
                    {Boolean(detail.is_void) && (
                      <>
                        <dt>Void Reason</dt>
                        <dd>{detail.void_reason || "-"}</dd>
                      </>
                    )}
                  </dl>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={() => printReceipt(detail.id)}
                  >
                    <Printer size={16} /> Print Receipt
                  </button>
                </>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
