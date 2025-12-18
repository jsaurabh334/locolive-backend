import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useToast } from '../context/ToastContext';

const Login = () => {
    const [formData, setFormData] = useState({ phone: '', password: '' });

    const { login, isLoading, error } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await login(formData);
            toast.success("Welcome back!");
            navigate('/');
        } catch (err) {
            toast.error(err.response?.data?.error || "Login failed");
        }
    };

    return (
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <Card className="p-6 md:p-8 shadow-2xl border-neutral-800">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center">Welcome Back</h2>
                    <p className="text-neutral-400 mb-8 text-center text-xs md:text-sm">Sign in to continue to Privacy Social</p>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            id="phone"
                            type="text"
                            label="Phone Number"
                            placeholder="+1234567890"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            required
                        />

                        <Input
                            id="password"
                            type="password"
                            label="Password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
                                {error.response?.data?.error || 'Login failed. Please check your credentials.'}
                            </div>
                        )}

                        <Button type="submit" isLoading={isLoading} className="w-full">
                            Sign In
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-neutral-400 text-sm">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                            Create account
                        </Link>
                    </p>
                </Card>
            </div>
        </div>
    );
};

export default Login;
