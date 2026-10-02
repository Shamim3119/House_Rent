import { NavLink } from 'react-router-dom';


const Sidebar = ({
    collapsed,
    mobileOpen,
    onCloseMobile
}) => {

    const handleNavigation = () => {
        onCloseMobile();
    };


    return (
        <aside
            className={
                `sidebar ${collapsed ? 'collapsed' : ''} ${
                    mobileOpen ? 'mobile-open' : ''
                }`
            }
        >

            {/* =========================================
                Brand
            ========================================= */}
            <div className="sidebar-brand">

                <div className="brand-icon">
                    H
                </div>

                <div className="brand-text">
                    <strong>House Rent</strong>
                    <span>Management System</span>
                </div>


                {/* Mobile Close Button */}
                <button
                    type="button"
                    className="mobile-sidebar-close"
                    onClick={onCloseMobile}
                    aria-label="Close menu"
                >
                    ×
                </button>

            </div>


            {/* =========================================
                Navigation
            ========================================= */}
            <nav className="sidebar-nav">

                <div className="nav-section">
                    MAIN
                </div>

                <NavLink
                    to="/dashboard"
                    onClick={handleNavigation}
                    title={collapsed ? 'Dashboard' : undefined}
                >
                    <span className="nav-icon">▦</span>
                    <span className="nav-label">
                        Dashboard
                    </span>
                </NavLink>


                <div className="nav-section">
                    PROPERTY
                </div>

                <NavLink
                    to="/houses"
                    onClick={handleNavigation}
                    title={collapsed ? 'Houses' : undefined}
                >
                    <span className="nav-icon">⌂</span>
                    <span className="nav-label">
                        Houses
                    </span>
                </NavLink>

                <NavLink
                    to="/property-types"
                    onClick={handleNavigation}
                    title={collapsed ? 'Property Types' : undefined}
                >
                    <span className="nav-icon">▤</span>
                    <span className="nav-label">
                        Property Types
                    </span>
                </NavLink>

                <NavLink
                    to="/property-units"
                    onClick={handleNavigation}
                    title={collapsed ? 'Property Units' : undefined}
                >
                    <span className="nav-icon">▦</span>
                    <span className="nav-label">
                        Property Units
                    </span>
                </NavLink>


                <div className="nav-section">
                    RENTAL
                </div>

                <NavLink
                    to="/tenants"
                    onClick={handleNavigation}
                    title={collapsed ? 'Tenants' : undefined}
                >
                    <span className="nav-icon">♙</span>
                    <span className="nav-label">
                        Tenants
                    </span>
                </NavLink>

                <NavLink
                    to="/tenancies"
                    onClick={handleNavigation}
                    title={collapsed ? 'Tenancies' : undefined}
                >
                    <span className="nav-icon">⌑</span>
                    <span className="nav-label">
                        Tenancies
                    </span>
                </NavLink>

                <NavLink
                    to="/tenancy-charges"
                    onClick={handleNavigation}
                    title={collapsed ? 'Tenancy Charges' : undefined}
                >
                    <span className="nav-icon">$</span>
                    <span className="nav-label">
                        Tenancy Charges
                    </span>
                </NavLink>


                <div className="nav-section">
                    BILLING
                </div>

                <NavLink
                    to="/monthly-bills"
                    onClick={handleNavigation}
                    title={collapsed ? 'Monthly Bills' : undefined}
                >
                    <span className="nav-icon">▧</span>
                    <span className="nav-label">
                        Monthly Bills
                    </span>
                </NavLink>

                <NavLink
                    to="/payments"
                    onClick={handleNavigation}
                    title={collapsed ? 'Payments' : undefined}
                >
                    <span className="nav-icon">$</span>
                    <span className="nav-label">
                        Payments
                    </span>
                </NavLink>


                <div className="nav-section">
                    REPORTS
                </div>

                <NavLink
                    to="/reports"
                    onClick={handleNavigation}
                    title={collapsed ? 'Reports' : undefined}
                >
                    <span className="nav-icon">▥</span>
                    <span className="nav-label">
                        Reports
                    </span>
                </NavLink>

            </nav>


 

        </aside>
    );
};


export default Sidebar;