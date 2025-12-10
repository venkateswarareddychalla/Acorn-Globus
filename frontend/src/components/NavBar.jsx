import { useNavigate } from 'react-router-dom'

const NavBar = ({ isLoggedIn, userRole, onLogout }) => {
  const navigate = useNavigate()

  if (!isLoggedIn) return null

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-3">
      <div className="max-w-7xl mx-auto glass-panel px-6 py-3 flex justify-between items-center">
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:shadow-blue-500/50 transition-all">
            S
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
            Sports<span className="font-light text-blue-400">Globus</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/booking')} 
            className="glass-button text-sm hover:text-blue-300"
          >
            Book Court
          </button>
          
          {userRole === 'admin' && (
            <div className="flex gap-2">
              <button 
                onClick={() => { console.log('Navigating to Admin'); navigate('/admin'); }} 
                className="glass-button text-sm hover:text-purple-300 border border-purple-500/50"
              >
                Admin Panel
              </button>
              <button 
                onClick={() => navigate('/admin/analytics')} 
                className="glass-button text-sm hover:text-green-300"
              >
                Analytics
              </button>
            </div>
          )}

          <div className="h-6 w-px bg-white/20 mx-2"></div>

          <div className="flex items-center gap-3">
            <div 
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-full hover:bg-white/5 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 flex items-center justify-center text-xs font-bold text-slate-900">
                {userRole === 'admin' ? 'A' : 'U'}
              </div>
              <span className="text-sm font-medium text-gray-300 hidden sm:block">
                {userRole === 'admin' ? 'Administrator' : 'Profile'}
              </span>
            </div>
            
            <button 
              onClick={onLogout} 
              className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-lg transition-all"
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default NavBar
