import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRepartidores } from './pages/AdminRepartidores'
import { DeliveryView } from './pages/DeliveryView'
import { History } from './pages/History'
import { Login } from './pages/Login'
import { MenuAdmin } from './pages/MenuAdmin'
import { OrderDetail } from './pages/OrderDetail'
import { OrdersBoard } from './pages/OrdersBoard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/repartidor/:token" element={<DeliveryView />} />

        <Route path="/pedidos" element={<ProtectedRoute><OrdersBoard /></ProtectedRoute>} />
        <Route path="/pedidos/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
        <Route path="/historial" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/menu" element={<ProtectedRoute><MenuAdmin /></ProtectedRoute>} />
        <Route path="/repartidores" element={<ProtectedRoute><AdminRepartidores /></ProtectedRoute>} />

        <Route path="*" element={<ProtectedRoute><OrdersBoard /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
