import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import ProtectedRoute from './components/ProtectedRoute'
import Auth from './pages/Auth'
import Main from './pages/Main'

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<Auth />} />
          
          {/* Protected routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Main />
              </ProtectedRoute>
            } 
          />

          
          {/* Redirect to auth if no route matches */}
          <Route path="*" element={<Navigate to="/auth#login" replace />} />
        </Routes>
      </Router>
    </Provider>
  )
}

export default App
