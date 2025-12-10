
import { useState } from "react";
import { enhancedApi } from "../services/enhancedApi";

const LoginPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let response;
      if (isLogin) {
        response = await enhancedApi.login({ email: formData.email, password: formData.password });
        console.log("LOGIN RESPONSE:", response);
        console.log("LOGIN DATA:", response.data);
      } else {
        response = await enhancedApi.register({ name: formData.name, email: formData.email, password: formData.password });
        console.log("REGISTER RESPONSE:", response);
      }

      if (isLogin) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("role", response.data.role);

        // Clear form data after successful login
        setFormData({ name: "", email: "", password: "" });

        onLogin();
      } else {
        // Clear form data after successful registration
        setFormData({ name: "", email: "", password: "" });

        alert("Registration successful! Please login.");
        setIsLogin(true);
      }
    } catch (error) {
      alert("Error: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="premium-card max-w-md w-full p-8 m-4 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
            Acorn Globus
          </h1>
          <p className="text-gray-400">
            {isLogin ? "Welcome back, athlete" : "Join the elite club"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="group">
              <input
                type="text"
                placeholder="Full Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="glass-input w-full"
                required
              />
            </div>
          )}
          <div className="group">
            <input
              type="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="glass-input w-full"
              required
            />
          </div>
          <div className="group">
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="glass-input w-full"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02] active:scale-95"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white/50 border-t-white rounded-full"></span>
                Processing...
              </span>
            ) : (
              isLogin ? "Sign In" : "Create Account"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              // Clear form data when switching between login and register
              setFormData({ name: "", email: "", password: "" });
            }}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
