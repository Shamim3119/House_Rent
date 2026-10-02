import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';


const Header = ({
    sidebarCollapsed,
    onToggleSidebar,
    onToggleMobileMenu
}) => {

    const {
        user,
        logout
    } = useAuth();

    const {
        theme,
        toggleTheme
    } = useTheme();


    return (
        <header className="top-header">

            {/* Left Side */}
            <div className="header-left">

                {/* Desktop Sidebar Toggle */}
                <button
                    type="button"
                    className="desktop-sidebar-toggle"
                    onClick={onToggleSidebar}
                    title={
                        sidebarCollapsed
                            ? 'Expand sidebar'
                            : 'Collapse sidebar'
                    }
                    aria-label={
                        sidebarCollapsed
                            ? 'Expand sidebar'
                            : 'Collapse sidebar'
                    }
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>


                {/* Mobile Menu Button */}
                <button
                    type="button"
                    className="mobile-menu-button"
                    onClick={onToggleMobileMenu}
                    aria-label="Open menu"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>


                <div className="header-heading">

                    <div className="header-title">
                        House Rent Management
                    </div>

                    <div className="header-subtitle">
                        Property & Tenant Management
                    </div>

                </div>

            </div>


            {/* Right Side */}
            <div className="header-right">

                {/* Theme Button */}
                <button
                    type="button"
                    className="theme-toggle"
                    onClick={toggleTheme}
                    title={
                        theme === 'light'
                            ? 'Switch to dark mode'
                            : 'Switch to light mode'
                    }
                    aria-label="Toggle theme"
                >
                    <span className="theme-icon">
                        {theme === 'light' ? '☾' : '☀'}
                    </span>

                    <span className="theme-text">
                        {theme === 'light' ? 'Dark' : 'Light'}
                    </span>
                </button>


                {/* User */}
                <div className="user-profile">

                    <div className="user-avatar">
                        {
                            user?.name
                                ?.charAt(0)
                                .toUpperCase() || 'U'
                        }
                    </div>

                    <div className="user-info">

                        <span className="user-name">
                            {user?.name}
                        </span>

                        <span className="user-role">
                            Administrator
                        </span>

                    </div>

                </div>


                {/* Logout */}
                <button
                    type="button"
                    className="logout-button"
                    onClick={logout}
                >
                    Logout
                </button>

            </div>

        </header>
    );
};


export default Header;