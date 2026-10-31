import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  DoorOpen,
  Users,
  Wallet,
  Receipt,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  FileText,
} from "lucide-react";

import api from "../api/axios";
import "./Dashboard.css";

const money = (value) =>
  Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonth);
  const [houseId, setHouseId] = useState("");
  const [houses, setHouses] = useState([]);

  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [outstanding, setOutstanding] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const requestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/houses")
      .then((response) => {
        if (cancelled) return;

        const data = response.data?.data ?? response.data;
        setHouses(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Dashboard houses error:", err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const requestId = ++requestRef.current;

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      const params = {
        month,
        ...(houseId ? { house_id: houseId } : {}),
      };

      try {
        const [overviewRes, trendRes, outstandingRes] = await Promise.all([
          api.get("/dashboard/overview", { params }),
          api.get("/dashboard/monthly-trend", { params }),
          api.get("/dashboard/outstanding", {
            params: { ...params, limit: 10 },
          }),
        ]);

        if (requestId !== requestRef.current) return;

        setOverview(overviewRes.data.data);
        setTrend(trendRes.data.data.months || []);
        setOutstanding(outstandingRes.data.data.rows || []);
      } catch (err) {
        if (requestId !== requestRef.current) return;

        setOverview(null);
        setTrend([]);
        setOutstanding([]);

        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load dashboard",
        );
      } finally {
        if (requestId === requestRef.current) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      requestRef.current += 1;
    };
  }, [month, houseId, refreshKey]);

  const financial = overview?.financial || {};
  const property = overview?.property || {};

  const chartMax = Math.max(
    1,
    ...trend.flatMap((row) => [
      Number(row.billed || 0),
      Number(row.net_collection || 0),
    ]),
  );

  const chartScale = Math.ceil(chartMax / 4 / 1000) * 1000 || 1;

  const chartTop = chartScale * 4;

  const chartTicks = [4, 3, 2, 1, 0].map((step) => step * chartScale);

  const compactMoney = (value) => {
    const number = Number(value || 0);

    if (Math.abs(number) >= 1000000) {
      return `${(number / 1000000).toFixed(1)}M`;
    }

    if (Math.abs(number) >= 1000) {
      return `${(number / 1000).toFixed(0)}K`;
    }

    return String(number);
  };

  const occupancy = property.total_units
    ? Math.round(
        (Number(property.occupied_units || 0) / Number(property.total_units)) *
          100,
      )
    : 0;

  const cards = [
    {
      label: "Monthly Rent Billed",
      value: money(financial.month_billed),
      icon: Receipt,
      currency: true,
      path: "/monthly-bills",
    },
    {
      label: "Monthly Net Collection",
      value: money(financial.month_net_collection),
      icon: Wallet,
      currency: true,
      path: `/reports?report=collection&month=${month}&auto=1${houseId ? `&house_id=${encodeURIComponent(houseId)}` : ""}`,
    },
    {
      label: "Outstanding Due",
      value: money(financial.outstanding_due),
      icon: AlertTriangle,
      currency: true,
      path: `/reports?report=summary&balance=due&month=${month}&auto=1${houseId ? `&house_id=${encodeURIComponent(houseId)}` : ""}`,
    },
    {
      label: "Tenant Advance",
      value: money(financial.tenant_advance),
      icon: TrendingUp,
      currency: true,
      path: `/reports?report=summary&balance=advance&month=${month}&auto=1${houseId ? `&house_id=${encodeURIComponent(houseId)}` : ""}`,
    },
    {
      label: "Total Houses",
      value: property.total_houses ?? 0,
      icon: Building2,
      path: "/houses",
    },
    {
      label: "Total Units",
      value: property.total_units ?? 0,
      icon: DoorOpen,
      path: "/property-units",
    },
    {
      label: "Occupied Units",
      value: property.occupied_units ?? 0,
      icon: Users,
      path: "/tenancies",
    },
    {
      label: "Vacant Units",
      value: property.vacant_units ?? 0,
      icon: DoorOpen,
      path: "/property-units",
    },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>House Rent Management Overview</p>
        </div>

        <div className="dashboard-filters">
          <select value={houseId} onChange={(e) => setHouseId(e.target.value)}>
            <option value="">All Houses</option>
            {houses.map((house) => (
              <option key={house.id} value={house.id}>
                {house.name}
              </option>
            ))}
          </select>

          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />

          <button
            type="button"
            onClick={() => setRefreshKey((v) => v + 1)}
            disabled={loading}
            title="Refresh Dashboard"
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="dashboard-error">{error}</div>}

      {loading && <div className="dashboard-loading">Loading dashboard...</div>}

      {!loading && overview && (
        <>
          <div className="dashboard-card-grid">
            {cards.map((card) => {
              const Icon = card.icon;

              return (
                <button
                  type="button"
                  className="dashboard-stat-card dashboard-card-clickable"
                  key={card.label}
                  onClick={() => navigate(card.path)}
                  title={`Open ${card.label}`}
                >
                  <div className="dashboard-card-top">
                    <span>{card.label}</span>
                    <Icon size={20} />
                  </div>

                  <strong>
                    {card.currency ? "৳ " : ""}
                    {card.value}
                  </strong>

                  <span className="dashboard-card-link">
                    View Details <ArrowRight size={14} />
                  </span>
                </button>
              );
            })}
          </div>

          <section className="dashboard-panel dashboard-quick-actions">
            <div className="dashboard-section-heading">
              <h2>Quick Actions</h2>
            </div>

            <div className="dashboard-action-grid">
              <button
                type="button"
                onClick={() => navigate("/monthly-bills")}
                className="dashboard-action-button"
              >
                <Receipt size={20} />
                <span>Monthly Bills</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => navigate("/reports")}
                className="dashboard-action-button"
              >
                <FileText size={20} />
                <span>View Reports</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => navigate("/property-units")}
                className="dashboard-action-button"
              >
                <Building2 size={20} />
                <span>Property Units</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => navigate("/tenancies")}
                className="dashboard-action-button"
              >
                <Users size={20} />
                <span>Tenancies</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </section>

          <div className="dashboard-details-grid">
            <section className="dashboard-panel">
              <h2>Property Occupancy</h2>

              <div className="dashboard-occupancy-number">{occupancy}%</div>

              <div className="dashboard-progress">
                <div style={{ width: `${occupancy}%` }} />
              </div>

              <p>
                {property.occupied_units || 0} occupied of{" "}
                {property.total_units || 0} units
              </p>

              <div className="dashboard-small-stats">
                <span>
                  Active Tenancies:{" "}
                  <strong>{property.active_tenancies || 0}</strong>
                </span>
                <span>
                  Due Tenancies: <strong>{financial.due_tenancies || 0}</strong>
                </span>
              </div>
            </section>

            <section className="dashboard-panel">
              <h2>Selected Month Collection</h2>

              <div className="dashboard-collection-line">
                <span>Received</span>
                <strong>৳ {money(financial.month_received)}</strong>
              </div>

              <div className="dashboard-collection-line">
                <span>Returned</span>
                <strong>৳ {money(financial.month_returned)}</strong>
              </div>

              <div className="dashboard-collection-line">
                <span>Net Collection</span>
                <strong>৳ {money(financial.month_net_collection)}</strong>
              </div>

              <div className="dashboard-collection-line">
                <span>Payment Transactions</span>
                <strong>{financial.payment_count || 0}</strong>
              </div>
            </section>
          </div>

          <section className="dashboard-panel">
            <div className="dashboard-section-heading">
              <div>
                <h2>Monthly Billing vs Collection</h2>
                <p>Last 12 months including selected month</p>
              </div>
            </div>

            <div className="dashboard-chart-legend">
              <span>
                <i className="dashboard-legend-billed" />
                Billed
              </span>

              <span>
                <i className="dashboard-legend-collected" />
                Net Collection
              </span>
            </div>

            <div className="dashboard-chart-scroll">
              <div className="dashboard-chart-layout">
                <div className="dashboard-chart-axis">
                  {chartTicks.map((tick) => (
                    <span key={tick}>{compactMoney(tick)}</span>
                  ))}
                </div>

                <div className="dashboard-chart-plot">
                  <div className="dashboard-chart-grid">
                    {chartTicks.map((tick) => (
                      <div className="dashboard-chart-grid-line" key={tick} />
                    ))}
                  </div>

                  <div className="dashboard-chart-columns">
                    {trend.map((row) => {
                      const billed = Number(row.billed || 0);
                      const collected = Number(row.net_collection || 0);

                      const billedHeight =
                        (Math.max(0, billed) / chartTop) * 100;

                      const collectedHeight =
                        (Math.max(0, collected) / chartTop) * 100;

                      return (
                        <div className="dashboard-chart-column" key={row.month}>
                          <div className="dashboard-chart-column-bars">
                            <div
                              className="dashboard-chart-bar billed"
                              style={{ height: `${billedHeight}%` }}
                              title={`${row.month}
Billed: ৳ ${money(billed)}`}
                            />

                            <div
                              className="dashboard-chart-bar collected"
                              style={{ height: `${collectedHeight}%` }}
                              title={`${row.month}
Net Collection: ৳ ${money(collected)}`}
                            />
                          </div>

                          <div className="dashboard-chart-month-label">
                            {new Date(
                              `${row.month}-01T00:00:00`,
                            ).toLocaleString("en-US", {
                              month: "short",
                              timeZone: "UTC",
                            })}
                          </div>

                          <small>{row.month.slice(0, 4)}</small>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <p className="dashboard-chart-note">
              Amounts are in BDT. Hover over bars for exact values. Negative net
              collections are not shown as bars.
            </p>
          </section>

          <section className="dashboard-panel">
            <h2>Top Outstanding Tenancies</h2>

            <div className="dashboard-table-scroll">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>House</th>
                    <th>Unit</th>
                    <th>Phone</th>
                    <th className="amount">Due Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {outstanding.map((row) => (
                    <tr key={row.tenancy_id}>
                      <td>{row.tenant_name}</td>
                      <td>{row.house_name}</td>
                      <td>{row.property_unit_name}</td>
                      <td>{row.tenant_phone || "—"}</td>
                      <td className="amount dashboard-due">
                        ৳ {money(row.closing_balance)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="dashboard-ledger-button"
                          onClick={() =>
                            navigate(
                              `/reports?report=ledger&tenancy_id=${encodeURIComponent(row.tenancy_id)}&month=${month}&auto=1${houseId ? `&house_id=${encodeURIComponent(houseId)}` : ""}`,
                            )
                          }
                        >
                          View Ledger <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {outstanding.length === 0 && (
                    <tr>
                      <td colSpan={6}>No outstanding tenancies found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;
