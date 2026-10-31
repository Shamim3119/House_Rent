import { useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  Search,
  Printer,
  Download,
  FileText,
  BookOpen,
  ArrowRight,
} from "lucide-react";

import api from "../api/axios";
import "./Reports.css";

const now = new Date();

const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

const money = (value) =>
  Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const balanceLabel = (value) => {
  const amount = Number(value || 0);

  if (amount < 0) return "Advance";
  if (amount > 0) return "Due";
  return "Settled";
};

const dateLabel = (value) => {
  if (!value) return "";

  const [date, time] = value.split(" ");

  return time && time !== "00:00:00" ? `${date} ${time}` : date;
};

const csvEscape = (value) => {
  const text = String(value ?? "");

  const safe = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;

  return `"${safe.replace(/"/g, '""')}"`;
};

const downloadCSV = (filename, rows) => {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");

  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const Reports = () => {
  const [searchParams] = useSearchParams();
  const requestIdRef = useRef(0);

  const requestedTab = searchParams.get("report");
  const validTabs = ["summary", "ledger", "collection", "monthly"];

  const initialTab = validTabs.includes(requestedTab)
    ? requestedTab
    : "summary";

  const requestedMonth = searchParams.get("month");
  const initialMonth =
    requestedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)
      ? requestedMonth
      : null;

  const requestedHouse = searchParams.get("house_id") || "";

  const requestedBalance = searchParams.get("balance");
  const validBalances = ["all", "due", "advance", "settled"];

  const initialBalance = validBalances.includes(requestedBalance)
    ? requestedBalance
    : "all";

  const [activeTab, setActiveTab] = useState(initialTab);

  const [fromMonth, setFromMonth] = useState(
    initialMonth || `${new Date().getFullYear()}-01`,
  );

  const [toMonth, setToMonth] = useState(initialMonth || currentMonth);

  const [houseId, setHouseId] = useState(requestedHouse);

  const [tenantId, setTenantId] = useState("");
  const [unitId, setUnitId] = useState("");
  const requestedTenancyId = searchParams.get("tenancy_id") || "";
  const [tenancyId, setTenancyId] = useState(
    /^\d+$/.test(requestedTenancyId) && Number(requestedTenancyId) > 0
      ? requestedTenancyId
      : "",
  );

  const [houses, setHouses] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [units, setUnits] = useState([]);
  const [tenancies, setTenancies] = useState([]);

  const [balanceFilter, setBalanceFilter] = useState(initialBalance);
  const [summary, setSummary] = useState(null);
  const [ledger, setLedger] = useState(null);

  const [collection, setCollection] = useState(null);
  const [monthlyCollection, setMonthlyCollection] = useState(null);

  const loadMonthlyCollection = async () => {
    if (!validateMonths()) return;

    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError("");
    setMonthlyCollection(null);

    try {
      const response = await api.get("/reports/monthly-collections", {
        params: {
          from_month: fromMonth,
          to_month: toMonth,
          ...(houseId ? { house_id: houseId } : {}),
          ...(tenantId ? { tenant_id: tenantId } : {}),
          ...(unitId ? { property_unit_id: unitId } : {}),
        },
      });

      if (requestId !== requestIdRef.current) return;

      setMonthlyCollection(response.data.data);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;

      console.error("Monthly collection error:", err);
      setError(getError(err));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const loadCollection = async () => {
    if (!validateMonths()) return;

    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError("");
    setCollection(null);

    try {
      const params = {
        from_month: fromMonth,
        to_month: toMonth,
      };

      if (houseId) params.house_id = houseId;
      if (tenantId) params.tenant_id = tenantId;
      if (unitId) params.property_unit_id = unitId;

      const response = await api.get("/reports/collections", {
        params,
      });

      if (requestId !== requestIdRef.current) return;

      setCollection(response.data.data);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;

      setError(getError(err));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getError = (err) =>
    err.response?.data?.message || err.message || "Failed to load report";

  const clearReports = () => {
    requestIdRef.current += 1;

    setSummary(null);
    setLedger(null);
    setCollection(null);
    setMonthlyCollection(null);

    setLoading(false);
    setError("");
  };

  const changeTab = (tab) => {
    requestIdRef.current += 1;
    setLoading(false);
    setError("");
    setActiveTab(tab);
  };

  useEffect(() => {
    let cancelled = false;

    const loadFilters = async () => {
      try {
        const results = await Promise.all([
          api.get("/houses"),
          api.get("/tenants"),
          api.get("/property-units"),
          api.get("/tenancies"),
        ]);

        if (cancelled) return;

        const extract = (response) => {
          const data = response.data?.data ?? response.data;

          return Array.isArray(data) ? data : [];
        };

        setHouses(extract(results[0]));
        setTenants(extract(results[1]));
        setUnits(extract(results[2]));
        setTenancies(extract(results[3]));
      } catch (err) {
        if (!cancelled) {
          setError(`Unable to load report filters: ${getError(err)}`);
        }
      }
    };

    loadFilters();

    return () => {
      cancelled = true;
    };
  }, []);

  const validateMonths = () => {
    if (!fromMonth || !toMonth) {
      setError("Please select From Month and To Month");
      return false;
    }

    if (fromMonth > toMonth) {
      setError("From Month cannot be after To Month");
      return false;
    }

    return true;
  };

  const loadSummary = async () => {
    if (!validateMonths()) return;

    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError("");
    setSummary(null);

    try {
      const params = {
        from_month: fromMonth,
        to_month: toMonth,
      };

      if (houseId) params.house_id = houseId;
      if (tenantId) params.tenant_id = tenantId;
      if (unitId) params.property_unit_id = unitId;

      const response = await api.get("/reports/summary", {
        params,
      });

      if (requestId !== requestIdRef.current) return;

      setSummary(response.data.data);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;

      setError(getError(err));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const loadLedger = async (selectedId = tenancyId) => {
    if (!validateMonths()) return;

    if (!selectedId) {
      setError("Please select a tenancy");
      return;
    }

    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError("");
    setLedger(null);

    try {
      const response = await api.get(`/reports/tenancy-ledger/${selectedId}`, {
        params: {
          from_month: fromMonth,
          to_month: toMonth,
        },
      });

      if (requestId !== requestIdRef.current) return;

      setLedger(response.data.data);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;

      setError(getError(err));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const openLedger = (id) => {
    setTenancyId(String(id));
    setActiveTab("ledger");
    setLedger(null);
    setError("");
    loadLedger(String(id));
  };

  // Apply the balance filter to the report already returned by the API.
  // Recalculate totals from visible rows so print and CSV match the table.
  const visibleRows = (summary?.rows || []).filter((row) => {
    const balance = Math.round(Number(row.closing_balance || 0) * 100);
    if (balanceFilter === "due") return balance > 0;
    if (balanceFilter === "advance") return balance < 0;
    if (balanceFilter === "settled") return balance === 0;
    return true;
  });

  const visibleTotals = visibleRows.reduce(
    (totals, row) => {
      for (const key of Object.keys(totals)) {
        totals[key] += Math.round(Number(row[key] || 0) * 100);
      }
      return totals;
    },
    {
      opening_balance: 0,
      period_billed: 0,
      period_added: 0,
      period_returned: 0,
      net_payment: 0,
      closing_balance: 0,
    },
  );

  for (const key of Object.keys(visibleTotals)) {
    visibleTotals[key] = visibleTotals[key] / 100;
  }

  const exportReport = () => {
    // =====================================
    // SUMMARY REPORT
    // =====================================
    if (activeTab === "summary" && summary) {
      const rows = [
        [
          "House",
          "Tenant",
          "Unit",
          "Opening Balance",
          "Period Bill",
          "Added",
          "Returned",
          "Net Payment",
          "Closing Balance",
          "Status",
        ],
        ...visibleRows.map((row) => [
          row.house_name,
          row.tenant_name,
          row.property_unit_name,
          row.opening_balance,
          row.period_billed,
          row.period_added,
          row.period_returned,
          row.net_payment,
          row.closing_balance,
          balanceLabel(row.closing_balance),
        ]),
        [
          "TOTAL",
          "",
          "",
          visibleTotals.opening_balance,
          visibleTotals.period_billed,
          visibleTotals.period_added,
          visibleTotals.period_returned,
          visibleTotals.net_payment,
          visibleTotals.closing_balance,
          "",
        ],
      ];

      downloadCSV(`rent-summary-${fromMonth}-${toMonth}.csv`, rows);

      return;
    }

    // =====================================
    // TENANT LEDGER
    // =====================================
    if (activeTab === "ledger" && ledger) {
      const rows = [
        [
          "Date",
          "Description",
          "Reference",
          "Debit",
          "Credit",
          "Balance",
          "Status",
        ],
        [
          `${fromMonth}-01`,
          "Opening Balance",
          "",
          "",
          "",
          ledger.summary.opening_balance,
          balanceLabel(ledger.summary.opening_balance),
        ],
        ...ledger.transactions.map((row) => [
          row.transaction_datetime,
          row.description,
          row.reference_no || "",
          row.debit,
          row.credit,
          row.running_balance,
          balanceLabel(row.running_balance),
        ]),
      ];

      downloadCSV(
        `tenant-ledger-${ledger.tenancy.tenancy_id}-${fromMonth}-${toMonth}.csv`,
        rows,
      );

      return;
    }

    // =====================================
    // COLLECTION REPORT
    // =====================================
    if (activeTab === "collection" && collection) {
      const rows = [
        [
          "Payment Date",
          "House",
          "Tenant",
          "Unit",
          "Reference",
          "Payment Type",
          "Received",
          "Returned",
          "Net Collection",
          "Note",
        ],

        ...collection.payments.map((row) => [
          row.payment_date,
          row.house_name,
          row.tenant_name,
          row.property_unit_name,
          row.reference_no || "",
          row.payment_type === "return" ? "Returned" : "Received",
          row.received,
          row.returned,
          row.net_collection,
          row.note || "",
        ]),

        [
          "TOTAL",
          "",
          "",
          "",
          "",
          "",
          collection.totals.received,
          collection.totals.returned,
          collection.totals.net_collection,
          "",
        ],
      ];

      downloadCSV(`rent-collection-${fromMonth}-${toMonth}.csv`, rows);

      return;
    }

    if (activeTab === "monthly" && monthlyCollection) {
      const rows = [
        ["Month", "Received", "Returned", "Net Collection", "Payment Count"],

        ...monthlyCollection.months.map((row) => [
          row.month,
          row.received,
          row.returned,
          row.net_collection,
          row.payment_count,
        ]),

        [
          "TOTAL",
          monthlyCollection.totals.received,
          monthlyCollection.totals.returned,
          monthlyCollection.totals.net_collection,
          monthlyCollection.totals.payment_count,
        ],
      ];

      downloadCSV(`monthly-collection-${fromMonth}-${toMonth}.csv`, rows);
      return;
    }

    setError("Please generate a report before exporting.");
  };

  const printReport = () => {
    const element = document.getElementById("report-print-area");

    if (!element) return;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setError("Please allow popups to print the report");
      return;
    }

    const styles = `
            body {
                font-family: Arial, sans-serif;
                padding: 20px;
                color: #111827;
            }
            h2 { margin-bottom: 6px; }
            table {
                width: 100%;
                border-collapse: collapse;
                font-size: 11px;
                margin-top: 16px;
            }
            th, td {
                border: 1px solid #cbd5e1;
                padding: 7px;
                text-align: left;
            }
            th { background: #f1f5f9; }
            .report-amount { text-align: right; }
            .report-stat-grid {
                display: flex;
                gap: 24px;
                flex-wrap: wrap;
                margin: 15px 0;
            }
            .report-stat { display: flex; flex-direction: column; }
            .report-stat span { font-size: 11px; }
            .report-stat strong { font-size: 16px; }
            .report-print-action { display: none; }
            @page { size: A4 landscape; margin: 12mm; }
        `;

    printWindow.document.open();
    printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>House Rent Report</title>
                <style>${styles}</style>
            </head>
            <body>
                ${element.innerHTML}
            </body>
            </html>
        `);

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };

    printWindow.document.close();
  };

  const filteredUnits = units.filter(
    (unit) => !houseId || String(unit.house_id) === String(houseId),
  );

  // Automatically generate report when opened from Dashboard.
  const autoLoadedRef = useRef(false);

  useEffect(() => {
    const autoGenerate = searchParams.get("auto");

    if (autoGenerate !== "1" || autoLoadedRef.current) {
      return;
    }

    autoLoadedRef.current = true;

    if (activeTab === "summary") {
      loadSummary();
    } else if (activeTab === "collection") {
      loadCollection();
    } else if (activeTab === "monthly") {
      loadMonthlyCollection();
    } else if (activeTab === "ledger" && tenancyId) {
      loadLedger();
    }

    // Only run once on initial Dashboard navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTenancies = tenancies.filter(
    (tenancy) =>
      (!houseId || String(tenancy.house_id) === String(houseId)) &&
      (!tenantId || String(tenancy.tenant_id) === String(tenantId)) &&
      (!unitId || String(tenancy.property_unit_id) === String(unitId)),
  );

  const renderBalance = (value) => {
    const amount = Number(value || 0);

    return (
      <span
        className={
          amount > 0
            ? "report-due"
            : amount < 0
              ? "report-advance"
              : "report-settled"
        }
      >
        {money(Math.abs(amount))}
        {amount < 0 ? " (Advance)" : ""}
      </span>
    );
  };

  return (
    <div className="reports-page">
      <div className="reports-heading">
        <div>
          <h2>Reports</h2>
          <p>
            Rent summary, tenant ledger, collection and monthly financial
            reports
          </p>
        </div>
      </div>

      <div className="reports-tabs">
        <button
          type="button"
          className={activeTab === "summary" ? "active" : ""}
          onClick={() => changeTab("summary")}
        >
          <FileText size={17} />
          Summary Report
        </button>

        <button
          type="button"
          className={activeTab === "ledger" ? "active" : ""}
          onClick={() => changeTab("ledger")}
        >
          <BookOpen size={17} />
          Tenant Ledger
        </button>

        <button
          type="button"
          className={activeTab === "collection" ? "active" : ""}
          onClick={() => changeTab("collection")}
        >
          <FileText size={17} />
          Collection Report
        </button>

        <button
          type="button"
          className={activeTab === "monthly" ? "active" : ""}
          onClick={() => changeTab("monthly")}
        >
          Monthly Collection
        </button>
      </div>

      <div className="reports-filter-panel">
        <div className="reports-filter-grid">
          <label>
            From Month
            <input
              type="month"
              value={fromMonth}
              onChange={(e) => {
                setFromMonth(e.target.value);
                clearReports();
              }}
            />
          </label>

          <label>
            To Month
            <input
              type="month"
              value={toMonth}
              onChange={(e) => {
                setToMonth(e.target.value);
                clearReports();
              }}
            />
          </label>

          <label>
            House
            <select
              value={houseId}
              onChange={(e) => {
                setHouseId(e.target.value);
                setUnitId("");
                setTenancyId("");
                clearReports();
              }}
            >
              <option value="">All Houses</option>
              {houses.map((house) => (
                <option key={house.id} value={house.id}>
                  {house.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tenant
            <select
              value={tenantId}
              onChange={(e) => {
                setTenantId(e.target.value);
                setTenancyId("");
                clearReports();
              }}
            >
              <option value="">All Tenants</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Unit
            <select
              value={unitId}
              onChange={(e) => {
                setUnitId(e.target.value);
                setTenancyId("");
                clearReports();
              }}
            >
              <option value="">All Units</option>
              {filteredUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </label>

          {activeTab === "summary" && (
            <label>
              Balance Status
              <select
                value={balanceFilter}
                onChange={(e) => setBalanceFilter(e.target.value)}
              >
                <option value="all">All Tenancies</option>
                <option value="due">Outstanding Only (Due)</option>
                <option value="advance">Advance Only</option>
                <option value="settled">Settled Only</option>
              </select>
            </label>
          )}

          {activeTab === "ledger" && (
            <label>
              Tenancy
              <select
                value={tenancyId}
                onChange={(e) => {
                  requestIdRef.current += 1;
                  setTenancyId(e.target.value);
                  setLedger(null);
                  setLoading(false);
                  setError("");
                }}
              >
                <option value="">Select Tenancy</option>
                {filteredTenancies.map((tenancy) => (
                  <option key={tenancy.id} value={tenancy.id}>
                    #{tenancy.id} -{" "}
                    {tenancy.tenant_name ||
                      tenants.find((t) => t.id === tenancy.tenant_id)?.name ||
                      "Tenant"}{" "}
                    -{" "}
                    {tenancy.property_unit_name ||
                      units.find((u) => u.id === tenancy.property_unit_id)
                        ?.name ||
                      "Unit"}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="reports-actions">
          <button
            type="button"
            className="reports-primary-button"
            disabled={loading}
            onClick={() => {
              if (activeTab === "summary") {
                loadSummary();
              } else if (activeTab === "ledger") {
                loadLedger();
              } else if (activeTab === "collection") {
                loadCollection();
              } else if (activeTab === "monthly") {
                loadMonthlyCollection();
              }
            }}
          >
            <Search size={16} />
            {loading ? "Loading..." : "Generate Report"}
          </button>

          <button
            type="button"
            disabled={
              loading ||
              (activeTab === "summary"
                ? !summary
                : activeTab === "ledger"
                  ? !ledger
                  : activeTab === "collection"
                    ? !collection
                    : !monthlyCollection)
            }
            onClick={printReport}
          >
            <Printer size={16} />
            Print
          </button>

          <button
            type="button"
            disabled={
              loading ||
              (activeTab === "summary"
                ? !summary
                : activeTab === "ledger"
                  ? !ledger
                  : activeTab === "collection"
                    ? !collection
                    : !monthlyCollection)
            }
            onClick={exportReport}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {error && <div className="reports-error">{error}</div>}

      {activeTab === "summary" && summary && (
        <div id="report-print-area" className="reports-result">
          <h2>Rent Summary Report</h2>
          <p>
            Balance Status:{" "}
            {balanceFilter === "all"
              ? "All Tenancies"
              : balanceLabel(
                  balanceFilter === "due"
                    ? 1
                    : balanceFilter === "advance"
                      ? -1
                      : 0,
                )}
            {" | "}Showing {visibleRows.length} of {summary.rows.length}{" "}
            tenancies
          </p>
          <p>
            Period: {summary.filters.from_month}
            {" to "}
            {summary.filters.to_month}
          </p>

          <div className="report-stat-grid">
            <div className="report-stat">
              <span>Opening Balance</span>
              <strong>{money(visibleTotals.opening_balance)}</strong>
            </div>
            <div className="report-stat">
              <span>Period Bill</span>
              <strong>{money(visibleTotals.period_billed)}</strong>
            </div>
            <div className="report-stat">
              <span>Net Payment</span>
              <strong>{money(visibleTotals.net_payment)}</strong>
            </div>
            <div className="report-stat">
              <span>Closing Balance</span>
              <strong>{renderBalance(visibleTotals.closing_balance)}</strong>
            </div>
          </div>

          <div className="reports-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>House</th>
                  <th>Tenant</th>
                  <th>Unit</th>
                  <th className="report-amount">Opening</th>
                  <th className="report-amount">Bill</th>
                  <th className="report-amount">Payment</th>
                  <th className="report-amount">Closing</th>
                  <th className="report-print-action">Ledger</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.tenancy_id}>
                    <td>{row.house_name}</td>
                    <td>{row.tenant_name}</td>
                    <td>{row.property_unit_name}</td>
                    <td className="report-amount">
                      {money(row.opening_balance)}
                    </td>
                    <td className="report-amount">
                      {money(row.period_billed)}
                    </td>
                    <td className="report-amount">{money(row.net_payment)}</td>
                    <td className="report-amount">
                      {renderBalance(row.closing_balance)}
                    </td>
                    <td className="report-print-action">
                      <button
                        type="button"
                        className="reports-link-button"
                        onClick={() => openLedger(row.tenancy_id)}
                      >
                        View <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}

                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan="8">No records found</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan="3">Total</th>
                  <th className="report-amount">
                    {money(visibleTotals.opening_balance)}
                  </th>
                  <th className="report-amount">
                    {money(visibleTotals.period_billed)}
                  </th>
                  <th className="report-amount">
                    {money(visibleTotals.net_payment)}
                  </th>
                  <th className="report-amount">
                    {renderBalance(visibleTotals.closing_balance)}
                  </th>
                  <th className="report-print-action" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {activeTab === "ledger" && ledger && (
        <div id="report-print-area" className="reports-result">
          <h2>Tenant Running Ledger</h2>

          <p>
            {ledger.tenancy.tenant_name}
            {" | "}
            {ledger.tenancy.house_name}
            {" | "}
            {ledger.tenancy.property_unit_name}
          </p>

          <p>
            Period: {ledger.filters.from_month}
            {" to "}
            {ledger.filters.to_month}
          </p>

          <div className="report-stat-grid">
            <div className="report-stat">
              <span>Opening Balance</span>
              <strong>{money(ledger.summary.opening_balance)}</strong>
            </div>
            <div className="report-stat">
              <span>Total Debit</span>
              <strong>{money(ledger.summary.total_debit)}</strong>
            </div>
            <div className="report-stat">
              <span>Total Credit</span>
              <strong>{money(ledger.summary.total_credit)}</strong>
            </div>
            <div className="report-stat">
              <span>Closing Balance</span>
              <strong>{renderBalance(ledger.summary.closing_balance)}</strong>
            </div>
          </div>

          <div className="reports-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Reference</th>
                  <th className="report-amount">Debit</th>
                  <th className="report-amount">Credit</th>
                  <th className="report-amount">Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr className="reports-opening-row">
                  <td>{ledger.filters.from_month}-01</td>
                  <td>Opening Balance</td>
                  <td>—</td>
                  <td className="report-amount">—</td>
                  <td className="report-amount">—</td>
                  <td className="report-amount">
                    {renderBalance(ledger.summary.opening_balance)}
                  </td>
                </tr>

                {ledger.transactions.map((row) => (
                  <tr key={`${row.transaction_type}-${row.transaction_id}`}>
                    <td>{dateLabel(row.transaction_datetime)}</td>
                    <td>{row.description}</td>
                    <td>{row.reference_no || "—"}</td>
                    <td className="report-amount">
                      {row.debit ? money(row.debit) : "—"}
                    </td>
                    <td className="report-amount">
                      {row.credit ? money(row.credit) : "—"}
                    </td>
                    <td className="report-amount">
                      {renderBalance(row.running_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan="3">Closing Balance</th>
                  <th className="report-amount">
                    {money(ledger.summary.total_debit)}
                  </th>
                  <th className="report-amount">
                    {money(ledger.summary.total_credit)}
                  </th>
                  <th className="report-amount">
                    {renderBalance(ledger.summary.closing_balance)}
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {activeTab === "collection" && collection && (
        <div id="report-print-area" className="reports-result">
          <h2>Rent Collection Report</h2>

          <p>
            Period: {collection.filters.from_month} to{" "}
            {collection.filters.to_month}
          </p>

          <div className="report-stat-grid">
            <div className="report-stat">
              <span>Total Received</span>
              <strong>{money(collection.totals.received)}</strong>
            </div>

            <div className="report-stat">
              <span>Total Returned</span>
              <strong>{money(collection.totals.returned)}</strong>
            </div>

            <div className="report-stat">
              <span>Net Collection</span>
              <strong>{money(collection.totals.net_collection)}</strong>
            </div>

            <div className="report-stat">
              <span>Payment Count</span>
              <strong>{collection.count}</strong>
            </div>
          </div>

          <div className="reports-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Payment Date</th>
                  <th>House</th>
                  <th>Tenant</th>
                  <th>Unit</th>
                  <th>Reference</th>
                  <th>Type</th>
                  <th className="report-amount">Received</th>
                  <th className="report-amount">Returned</th>
                  <th className="report-amount">Net</th>
                </tr>
              </thead>

              <tbody>
                {collection.payments.map((row) => (
                  <tr key={row.payment_id}>
                    <td>{dateLabel(row.payment_date)}</td>
                    <td>{row.house_name}</td>
                    <td>{row.tenant_name}</td>
                    <td>{row.property_unit_name}</td>
                    <td>{row.reference_no || "—"}</td>
                    <td>
                      {row.payment_type === "return" ? "Returned" : "Received"}
                    </td>
                    <td className="report-amount">{money(row.received)}</td>
                    <td className="report-amount">{money(row.returned)}</td>
                    <td className="report-amount">
                      {money(row.net_collection)}
                    </td>
                  </tr>
                ))}

                {collection.payments.length === 0 && (
                  <tr>
                    <td colSpan={9}>No payments found</td>
                  </tr>
                )}
              </tbody>

              <tfoot>
                <tr>
                  <th colSpan={6}>TOTAL</th>
                  <th className="report-amount">
                    {money(collection.totals.received)}
                  </th>
                  <th className="report-amount">
                    {money(collection.totals.returned)}
                  </th>
                  <th className="report-amount">
                    {money(collection.totals.net_collection)}
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {activeTab === "monthly" && monthlyCollection && (
        <div id="report-print-area" className="reports-result">
          <h2>Monthly Collection Summary</h2>

          <p>
            Period: {monthlyCollection.filters.from_month} to{" "}
            {monthlyCollection.filters.to_month}
          </p>

          <div className="report-stat-grid">
            <div className="report-stat">
              <span>Total Received</span>
              <strong>{money(monthlyCollection.totals.received)}</strong>
            </div>

            <div className="report-stat">
              <span>Total Returned</span>
              <strong>{money(monthlyCollection.totals.returned)}</strong>
            </div>

            <div className="report-stat">
              <span>Net Collection</span>
              <strong>{money(monthlyCollection.totals.net_collection)}</strong>
            </div>

            <div className="report-stat">
              <span>Payment Count</span>
              <strong>{monthlyCollection.totals.payment_count}</strong>
            </div>
          </div>

          <div className="reports-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="report-amount">Received</th>
                  <th className="report-amount">Returned</th>
                  <th className="report-amount">Net Collection</th>
                  <th className="report-amount">Payment Count</th>
                </tr>
              </thead>

              <tbody>
                {monthlyCollection.months.map((row) => (
                  <tr key={row.month}>
                    <td>{row.month}</td>
                    <td className="report-amount">{money(row.received)}</td>
                    <td className="report-amount">{money(row.returned)}</td>
                    <td className="report-amount">
                      {money(row.net_collection)}
                    </td>
                    <td className="report-amount">{row.payment_count}</td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr>
                  <th>TOTAL</th>
                  <th className="report-amount">
                    {money(monthlyCollection.totals.received)}
                  </th>
                  <th className="report-amount">
                    {money(monthlyCollection.totals.returned)}
                  </th>
                  <th className="report-amount">
                    {money(monthlyCollection.totals.net_collection)}
                  </th>
                  <th className="report-amount">
                    {monthlyCollection.totals.payment_count}
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {!(activeTab === "summary"
        ? summary
        : activeTab === "ledger"
          ? ledger
          : activeTab === "collection"
            ? collection
            : monthlyCollection) &&
        !loading &&
        !error && (
          <div className="reports-placeholder">
            <FileText size={36} />
            <p>Select filters and click Generate Report.</p>
          </div>
        )}
    </div>
  );
};

export default Reports;
