import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        phone: '',
        password: ''
    });
    const { register, isLoading, error } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await register(formData);
            navigate('/');
        } catch (err) {
            console.error('Registration failed', err);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <Card className="p-8 shadow-2xl border-neutral-800">
                    <h2 className="text-3xl font-bold text-white mb-2 text-center">Create Account</h2>
                    <p className="text-neutral-400 mb-8 text-center text-sm">Join the privacy-first revolution</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            id="username"
                            label="Username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            required
                        />
                        <Input
                            id="full_name"
                            label="Full Name"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            required
                        />
                        <Input
                            id="phone"
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
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                        />

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm text-center">
                                {error.response?.data?.error || 'Registration failed. Please try again.'}
                            </div>
                        )}

                        <div className="pt-2">
                            <Button type="submit" isLoading={isLoading} className="w-full">
                                Create Account
                            </Button>
                        </div>
                    </form>

                    <p className="mt-6 text-center text-neutral-400 text-sm">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                            Sign in
                        </Link>
                    </p>
                </Card>
            </div>
        </div>
    );
};

export default Register;
