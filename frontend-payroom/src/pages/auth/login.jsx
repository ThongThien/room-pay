import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogin, useCurrentUser } from '../../store/auth.store'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

function Login() {
  const navigate = useNavigate()
  const { mutateAsync: login, isPending } = useLogin()
  const { data: user } = useCurrentUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')

  useEffect(() => {
    if (user) {
      navigate(`/${user.role}`, { replace: true })
    }
  }, [user, navigate])

  const validateForm = () => {
    const newErrors = {}
    if (!email.trim()) {
      newErrors.email = 'Email là bắt buộc'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email không hợp lệ'
    }

    if (!password) {
      newErrors.password = 'Mật khẩu là bắt buộc'
    } else if (password.length < 3) { 
      newErrors.password = 'Mật khẩu quá ngắn'
    }
    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGeneralError('')
    setErrors({})

    const formErrors = validateForm()
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors)
      return
    }

    try {
      const result = await login({ email, password })
      if (result && result.user) {
        navigate(`/${result.user.role}`, { replace: true })
      }
    } catch (error) {
      setGeneralError(error.message || 'Đăng nhập thất bại. Vui lòng thử lại.')
    }
  }
  const handleEmailChange = (e) => {
    setEmail(e.target.value)
    if (errors.email) setErrors({ ...errors, email: '' })
  }

  const handlePasswordChange = (e) => {
    setPassword(e.target.value)
    if (errors.password) setErrors({ ...errors, password: '' })
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Đăng nhập</h1>
          <p className="text-sm text-gray-500 mt-2">Hệ thống quản lý phòng trọ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {generalError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center animate-pulse">
              {generalError}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            id="email"
            name="email"
            placeholder="Nhập email..."
            value={email}
            onChange={handleEmailChange}
            error={errors.email}
            disabled={isPending}
            required
          />

          <Input
            label="Mật khẩu"
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={handlePasswordChange}
            error={errors.password}
            disabled={isPending}
            required
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-blue-600 focus:outline-none transition-colors"
                tabIndex="-1" 
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                )}
              </button>
            }
          />
          <Button
            type="submit"
            isLoading={isPending}
            variant="primary"
            size="md"
            className="w-full"
          >
            Đăng nhập
          </Button>
        </form>
      </div>
    </div>
  )
}

export default Login