import {
    faBars,
    faLock,
    faMoon,
    faRightFromBracket,
    faSun,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { RootState } from '../../state/store'
import { useSidebar } from '../../context/SidebarContext'
import { defaultAppPath } from '../../billing/config/menu.config'
import { authLogout } from '../../login/components/state/loginSlice'
import { routerPathNames } from '../../routes/routerPathNames'
import { appHref } from '../../billingConfig'
import { useCompanyName } from '../../context/CompanyNameContext'
import { useThemeMode } from '../../theme/ThemeRoot'
import './header.css'

const Header = () => {
    const dispatch = useDispatch()
    const { toggleMobileSidebar, toggleSidebar, collapsed } = useSidebar()
    const { mode, toggleTheme } = useThemeMode()
    const loginData = useSelector((state: RootState) => state.loginData)
    const { companyName } = useCompanyName()
    const userName = loginData?.fullName?.trim() || loginData?.name?.trim() || loginData?.userName?.trim() || 'Signed-in user'
    const userInitial = userName.charAt(0).toUpperCase()
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!menuOpen) return
        const onDoc = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false)
            }
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuOpen(false)
        }
        document.addEventListener('mousedown', onDoc)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDoc)
            document.removeEventListener('keydown', onKey)
        }
    }, [menuOpen])

    const handleLogout = () => {
        dispatch(authLogout())
        window.location.href = appHref('/login')
    }

    return (
        <div className="app-header-shell">
            <header className="app-header-content">
                <div className="header-left">
                    <button
                        type="button"
                        className="header-icon-btn header-menu-btn--mobile"
                        onClick={toggleMobileSidebar}
                        aria-label="Open navigation menu"
                    >
                        <FontAwesomeIcon icon={faBars} />
                    </button>
                    <button
                        type="button"
                        className={`header-icon-btn header-menu-btn--desktop${collapsed ? ' is-collapsed' : ''}`}
                        onClick={toggleSidebar}
                        aria-label="Toggle sidebar"
                    >
                        <FontAwesomeIcon icon={faBars} />
                    </button>
                    <Link to={defaultAppPath(loginData?.moduleIds)} className="header-brand" title="Home">
                        {companyName || 'Company'}
                    </Link>
                </div>

                <div className="header-center" aria-hidden="true" />

                <div className="header-right">
                    <button
                        type="button"
                        className="header-icon-btn"
                        aria-label={mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                        title={mode === 'dark' ? 'Light theme' : 'Dark theme'}
                        onClick={toggleTheme}
                    >
                        <FontAwesomeIcon icon={mode === 'dark' ? faSun : faMoon} />
                    </button>

                    <div className="header-action" ref={menuRef}>
                        <button
                            type="button"
                            className={`header-user${menuOpen ? ' is-open' : ''}`}
                            onClick={() => setMenuOpen((open) => !open)}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            title={userName}
                        >
                            <span className="header-avatar">{userInitial}</span>
                            <span className="header-user-name">{userName}</span>
                        </button>
                        {menuOpen && (
                            <div className="header-popover header-popover--profile" role="menu">
                                <div className="header-profile-head">
                                    <span className="header-avatar">{userInitial}</span>
                                    <p className="header-popover-title">{userName}</p>
                                </div>
                                <Link
                                    to={routerPathNames.users.changePassword}
                                    className="header-profile-item"
                                    role="menuitem"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    <FontAwesomeIcon icon={faLock} />
                                    Change password
                                </Link>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        className="header-icon-btn"
                        onClick={handleLogout}
                        aria-label="Logout"
                        title="Logout"
                    >
                        <FontAwesomeIcon icon={faRightFromBracket} />
                    </button>
                </div>
            </header>
        </div>
    )
}

export default Header
