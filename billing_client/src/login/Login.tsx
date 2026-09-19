import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUser,
  faLock,
  faEye,
  faEyeSlash,
  faCircleNotch,
  faShieldHalved,
  faCircleExclamation,
} from '@fortawesome/free-solid-svg-icons'
import { LoginApiService } from '../api/login/login-api-service'
import { StorageService } from '../api/storage/storageService'
import { saveLoginDataAction, authLogout } from './components/state/loginSlice'
import { RootState } from '../state/store'
import { defaultAppPath } from '../billing/config/menu.config'
import { useCompanyName } from '../context/CompanyNameContext'
import logo from '../assets/images/logo.png'
import './Login.css'

const Login = () => {
  const loginUser = useSelector((s: RootState) => s.loginData)
  const { companyName } = useCompanyName()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const brandName = companyName || 'Company'

  const loginApiService: LoginApiService = new LoginApiService()
  const storageService: StorageService = new StorageService()
  const [user, setUser] = useState({ userName: '', password: '' })
  const [errorMessage, setErrorMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setUser((pre) => ({ ...pre, [name]: value }))
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    setErrorMessage('')
    setIsSubmitting(true)
    try {
      dispatch(authLogout())
      const response = await loginApiService.loginUser({
        userName: user.userName.trim(),
        password: user.password,
      })
      if (response?.success) {
        dispatch(saveLoginDataAction(response?.data))
        storageService.setToken(response?.data?.accessToken)
        navigate(defaultAppPath(response?.data?.moduleIds))
      } else {
        setErrorMessage(response?.data?.error || 'Login failed')
      }
    } catch (error: any) {
      const apiError =
        error?.response?.data?.data?.error ||
        error?.response?.data?.error ||
        error?.response?.data?.message
      if (error.code === 'ERR_NETWORK') {
        setErrorMessage('Network error. Check that the billing server is running.')
      } else if (!apiError || apiError === 'Invalid Credentials' || error?.response?.status === 401) {
        setErrorMessage('Invalid username or password')
      } else {
        setErrorMessage(apiError)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (loginUser.authorized && storageService.getToken()) {
      navigate(defaultAppPath(loginUser.moduleIds))
    }
  }, [loginUser])

  return (
    <div className="login-page">
      <div className="login-board">
        <section className="login-brand">
          <img className="login-logo" src={logo} alt={brandName} />
        </section>

        <section className="login-form-side">
          <p className="login-form-kicker">Staff access</p>
          <h2 className="login-form-heading">Sign in</h2>
          <p className="login-form-sub">Use your username and password.</p>

          {errorMessage && (
            <div className="login-alert" role="alert" aria-live="assertive">
              <FontAwesomeIcon icon={faCircleExclamation} className="login-alert-icon" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="login-field">
              <label htmlFor="login-username">Username</label>
              <div className="login-input-wrap">
                <FontAwesomeIcon icon={faUser} className="login-input-icon" />
                <input
                  id="login-username"
                  className="login-input"
                  type="text"
                  name="userName"
                  value={user.userName}
                  onChange={handleChange}
                  placeholder="Enter username"
                  autoFocus
                  autoComplete="username"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <div className="login-input-wrap">
                <FontAwesomeIcon icon={faLock} className="login-input-icon" />
                <input
                  id="login-password"
                  className="login-input"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={user.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="login-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} />
                </button>
              </div>
            </div>

            <button className="login-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <FontAwesomeIcon icon={faCircleNotch} className="login-spin" />
                  Signing in
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="login-secure">
            <FontAwesomeIcon icon={faShieldHalved} />
            Encrypted session · © {new Date().getFullYear()} {brandName}
          </p>
        </section>
      </div>
    </div>
  )
}

export default Login
