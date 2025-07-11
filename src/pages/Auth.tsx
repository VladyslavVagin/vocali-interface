import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Login from './Login'
import Register from './Register'
import Confirmation from './Confirmation'
import type { RootState } from '../redux/store'

const Auth = () => {
  const location = useLocation()
  const [currentView, setCurrentView] = useState<'login' | 'register'>('login')
  const { needsConfirmation } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (hash === 'register') {
      setCurrentView('register')
    } else {
      setCurrentView('login')
    }
  }, [location.hash])

  // Show confirmation page if user needs to confirm email
  if (needsConfirmation) {
    return <Confirmation />
  }

  return (
    <div>
      {currentView === 'login' ? <Login /> : <Register />}
    </div>
  )
}

export default Auth 