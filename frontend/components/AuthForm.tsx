import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

// Clean, consistent styles that definitely work
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '40px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
    position: 'relative' as const
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '30px'
  },
  title: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '1rem',
    color: '#666',
    marginBottom: '0'
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '4px'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: 'white',
    boxSizing: 'border-box' as const
  },
  inputFocused: {
    borderColor: '#667eea',
    boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)'
  },
  button: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#667eea',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    marginTop: '10px'
  },
  buttonHover: {
    backgroundColor: '#5a67d8',
    transform: 'translateY(-1px)',
    boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
    transform: 'none',
    boxShadow: 'none'
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '0',
    marginTop: '15px'
  },
  errorText: {
    color: '#dc2626',
    fontSize: '12px',
    marginTop: '4px'
  },
  loadingSpinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid #ffffff',
    borderRadius: '50%',
    borderTopColor: 'transparent',
    animation: 'spin 1s linear infinite',
    marginRight: '8px'
  }
}

export default function AuthForm() {
  const { signInWithEmail, signUpWithEmail } = useAuth()
  
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [buttonHover, setButtonHover] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    
    if (isSignUp && !formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the errors below')
      return
    }

    setLoading(true)
    
    try {
      if (isSignUp) {
        const { error } = await signUpWithEmail(
          formData.email, 
          formData.password,
          { full_name: formData.fullName }
        )
        
        if (error) {
          throw new Error(error.message)
        }
        
        toast.success('🎉 Account created successfully! Please check your email to verify your account.')
      } else {
        const { error } = await signInWithEmail(formData.email, formData.password)
        
        if (error) {
          throw new Error(error.message)
        }
        
        toast.success('🚀 Welcome back! Redirecting to your dashboard...')
      }
    } catch (error: any) {
      console.error('Auth error:', error)
      const errorMessage = error.message || 'Something went wrong'
      toast.error(`❌ ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setErrors({})
    setFormData({ email: '', password: '', fullName: '' })
    toast.success(isSignUp ? '🔐 Switched to Sign In' : '✨ Switched to Sign Up')
  }

  return (
    <>
      {/* Add keyframes for spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <h1 style={styles.title}>
              {isSignUp ? '✨ Create Account' : '🔐 Welcome Back'}
            </h1>
            <p style={styles.subtitle}>
              {isSignUp 
                ? 'Join thousands of UPSC aspirants' 
                : 'Sign in to continue your UPSC preparation'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Full Name (Sign Up Only) */}
            {isSignUp && (
              <div style={styles.inputGroup}>
                <label style={styles.label}>👤 Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  onFocus={() => setFocusedField('fullName')}
                  onBlur={() => setFocusedField(null)}
                  style={{
                    ...styles.input,
                    ...(focusedField === 'fullName' ? styles.inputFocused : {}),
                    borderColor: errors.fullName ? '#dc2626' : (focusedField === 'fullName' ? '#667eea' : '#d1d5db')
                  }}
                  placeholder="Enter your full name"
                  disabled={loading}
                />
                {errors.fullName && (
                  <span style={styles.errorText}>{errors.fullName}</span>
                )}
              </div>
            )}

            {/* Email */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>📧 Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...styles.input,
                  ...(focusedField === 'email' ? styles.inputFocused : {}),
                  borderColor: errors.email ? '#dc2626' : (focusedField === 'email' ? '#667eea' : '#d1d5db')
                }}
                placeholder="Enter your email address"
                disabled={loading}
              />
              {errors.email && (
                <span style={styles.errorText}>{errors.email}</span>
              )}
            </div>

            {/* Password */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>🔒 Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...styles.input,
                  ...(focusedField === 'password' ? styles.inputFocused : {}),
                  borderColor: errors.password ? '#dc2626' : (focusedField === 'password' ? '#667eea' : '#d1d5db')
                }}
                placeholder={isSignUp ? "Create a strong password (min 6 chars)" : "Enter your password"}
                disabled={loading}
              />
              {errors.password && (
                <span style={styles.errorText}>{errors.password}</span>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              onMouseEnter={() => setButtonHover(true)}
              onMouseLeave={() => setButtonHover(false)}
              style={{
                ...styles.button,
                ...(loading ? styles.buttonDisabled : (buttonHover ? styles.buttonHover : {}))
              }}
            >
              {loading && <span style={styles.loadingSpinner}></span>}
              {loading 
                ? (isSignUp ? 'Creating Account...' : 'Signing In...') 
                : (isSignUp ? '🚀 Create Account' : '🎯 Sign In')
              }
            </button>

            {/* Toggle Mode */}
            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={toggleMode}
                style={styles.toggleButton}
                disabled={loading}
              >
                {isSignUp 
                  ? '🔐 Already have an account? Sign In' 
                  : '✨ Need an account? Sign Up'
                }
              </button>
            </div>
          </form>

          {/* Footer Info */}
          <div style={{ 
            marginTop: '30px', 
            textAlign: 'center', 
            fontSize: '12px', 
            color: '#9ca3af',
            borderTop: '1px solid #f3f4f6',
            paddingTop: '20px'
          }}>
            <p>🎓 IntrepidQ generator</p>
            <p>AI-powered preparation for civil services mains Examination</p>
          </div>
        </div>
      </div>
    </>
  )
}