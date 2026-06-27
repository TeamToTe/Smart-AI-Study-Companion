import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, X, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';
import './AuthModal.css';

export default function AuthModal({ isOpen, onClose, lang = 'vi' }) {
  const { signIn, signUp, resetPassword } = useAuth();
  
  // Modes: 'signin' | 'signup' | 'forgot'
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const t = (key) => {
    const translations = {
      en: {
        titleSignIn: "Welcome Back",
        subtitleSignIn: "Sign in to access your smart study companion",
        titleSignUp: "Create Account",
        subtitleSignUp: "Start protecting academic terms and transcribing videos",
        titleForgot: "Reset Password",
        subtitleForgot: "We'll send you an email to reset your password",
        emailLabel: "Email Address",
        emailPlaceholder: "name@example.com",
        passwordLabel: "Password",
        passwordPlaceholder: "Minimum 6 characters",
        confirmPasswordLabel: "Confirm Password",
        confirmPasswordPlaceholder: "Repeat password",
        btnSignIn: "Sign In",
        btnSignUp: "Sign Up",
        btnReset: "Send Reset Link",
        noAccount: "Don't have an account?",
        haveAccount: "Already have an account?",
        forgotPass: "Forgot password?",
        backToLogin: "Back to Login",
        errorPasswordMismatch: "Passwords do not match!",
        errorEmptyFields: "Please fill in all fields.",
        successResetSent: "Reset link sent! Please check your email inbox.",
        successSignUp: "Registration successful! You can now sign in.",
        errorGeneral: "An error occurred. Please try again."
      },
      vi: {
        titleSignIn: "Chào Mừng Quay Lại",
        subtitleSignIn: "Đăng nhập để sử dụng trợ lý học tập AI thông minh",
        titleSignUp: "Tạo Tài Khoản",
        subtitleSignUp: "Bắt đầu bảo vệ thuật ngữ và dịch bài giảng tự động",
        titleForgot: "Khôi Phục Mật Khẩu",
        subtitleForgot: "Chúng tôi sẽ gửi email khôi phục mật khẩu cho bạn",
        emailLabel: "Địa chỉ Email",
        emailPlaceholder: "ten@vi-du.com",
        passwordLabel: "Mật khẩu",
        passwordPlaceholder: "Tối thiểu 6 ký tự",
        confirmPasswordLabel: "Xác nhận mật khẩu",
        confirmPasswordPlaceholder: "Nhập lại mật khẩu",
        btnSignIn: "Đăng Nhập",
        btnSignUp: "Đăng Ký",
        btnReset: "Gửi Link Khôi Phục",
        noAccount: "Chưa có tài khoản?",
        haveAccount: "Đã có tài khoản?",
        forgotPass: "Quên mật khẩu?",
        backToLogin: "Quay lại Đăng nhập",
        errorPasswordMismatch: "Mật khẩu xác nhận không khớp!",
        errorEmptyFields: "Vui lòng nhập đầy đủ các trường thông tin.",
        successResetSent: "Link khôi phục đã gửi! Vui lòng kiểm tra email của bạn.",
        successSignUp: "Đăng ký thành công! Hiện tại bạn có thể đăng nhập.",
        errorGeneral: "Đã xảy ra lỗi. Vui lòng thử lại."
      }
    };
    return translations[lang]?.[key] || key;
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setErrorMsg('');
    setSuccessMsg('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email) {
      setErrorMsg(t('errorEmptyFields'));
      return;
    }

    if (mode !== 'forgot' && !password) {
      setErrorMsg(t('errorEmptyFields'));
      return;
    }

    setSubmitting(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMsg(error.message);
        } else {
          onClose(); // Close modal on success
        }
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          setErrorMsg(t('errorPasswordMismatch'));
          setSubmitting(false);
          return;
        }
        const { error } = await signUp(email, password);
        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg(t('successSignUp'));
          setTimeout(() => switchMode('signin'), 2000);
        }
      } else if (mode === 'forgot') {
        const { error } = await resetPassword(email, window.location.origin);
        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg(t('successResetSent'));
        }
      }
    } catch (err) {
      setErrorMsg(t('errorGeneral'));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal-container">
        {/* Close Button */}
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        {/* Decorative elements */}
        <div className="auth-glow-1"></div>
        <div className="auth-glow-2"></div>

        {/* Header */}
        <div className="auth-modal-header">
          <div className="auth-logo-badge">
            <Sparkles size={22} className="sparkle-anim" />
          </div>
          <h2>
            {mode === 'signin' && t('titleSignIn')}
            {mode === 'signup' && t('titleSignUp')}
            {mode === 'forgot' && t('titleForgot')}
          </h2>
          <p>
            {mode === 'signin' && t('subtitleSignIn')}
            {mode === 'signup' && t('subtitleSignUp')}
            {mode === 'forgot' && t('subtitleForgot')}
          </p>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div className="auth-alert error">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-alert success">
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-modal-form">
          <div className="form-group">
            <label htmlFor="auth-email">{t('emailLabel')}</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={16} />
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('emailPlaceholder')}
                disabled={submitting}
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div className="form-group">
              <div className="label-row">
                <label htmlFor="auth-password">{t('passwordLabel')}</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    className="text-btn forgot-link"
                    onClick={() => switchMode('forgot')}
                    disabled={submitting}
                  >
                    {t('forgotPass')}
                  </button>
                )}
              </div>
              <div className="input-wrapper">
                <Lock className="input-icon" size={16} />
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('passwordPlaceholder')}
                  disabled={submitting}
                  minLength={6}
                />
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="auth-confirm-password">{t('confirmPasswordLabel')}</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={16} />
                <input
                  id="auth-confirm-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('confirmPasswordPlaceholder')}
                  disabled={submitting}
                  minLength={6}
                />
              </div>
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={submitting}>
            {submitting ? (
              <span className="spinner-dots">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </span>
            ) : (
              <>
                {mode === 'signin' && t('btnSignIn')}
                {mode === 'signup' && t('btnSignUp')}
                {mode === 'forgot' && t('btnReset')}
              </>
            )}
          </button>
        </form>

        {/* Footer Toggle */}
        <div className="auth-modal-footer">
          {mode === 'signin' && (
            <p>
              {t('noAccount')}{' '}
              <button type="button" className="text-btn switch-btn" onClick={() => switchMode('signup')} disabled={submitting}>
                {t('btnSignUp')}
              </button>
            </p>
          )}
          {mode === 'signup' && (
            <p>
              {t('haveAccount')}{' '}
              <button type="button" className="text-btn switch-btn" onClick={() => switchMode('signin')} disabled={submitting}>
                {t('btnSignIn')}
              </button>
            </p>
          )}
          {mode === 'forgot' && (
            <button type="button" className="text-btn back-btn" onClick={() => switchMode('signin')} disabled={submitting}>
              {t('backToLogin')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
