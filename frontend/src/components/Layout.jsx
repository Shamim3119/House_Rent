import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Sidebar from './Sidebar';
import Header from './Header';


const Layout = () => {

    // Desktop sidebar:
    // false = full width
    // true  = icon-only collapsed sidebar
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // Mobile sidebar:
    // false = hidden
    // true  = slide-in drawer
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


    const toggleSidebar = () => {
        setSidebarCollapsed((current) => !current);
    };


    const toggleMobileMenu = () => {
        setMobileMenuOpen((current) => !current);
    };


    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
    };


    return (
        <div
            className={
                `app-layout ${
                    sidebarCollapsed
                        ? 'sidebar-collapsed'
                        : ''
                }`
            }
        >

            {/* Mobile dark backdrop */}
            {mobileMenuOpen && (
                <div
                    className="sidebar-backdrop"
                    onClick={closeMobileMenu}
                />
            )}


            <Sidebar
                collapsed={sidebarCollapsed}
                mobileOpen={mobileMenuOpen}
                onCloseMobile={closeMobileMenu}
            />


            <div className="main-area">

                <Header
                    sidebarCollapsed={sidebarCollapsed}
                    onToggleSidebar={toggleSidebar}
                    onToggleMobileMenu={toggleMobileMenu}
                />

                <main className="main-content">
                    <Outlet />
                </main>

            </div>

        </div>
    );
};


export default Layout;