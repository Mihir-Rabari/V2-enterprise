import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:5000/api/v1' });

const testAuth = async () => {
    try {
        console.log('Testing Admin Login...');
        const loginRes = await api.post('/auth/login', {
            email: 'admin@v2fashion.com',
            password: 'admin@v2'
        });
        console.log('✅ Login successful!');
        const token = loginRes.data.data.token;
        console.log('Token received:', token.substring(0, 10) + '...');

        console.log('Testing Protected Route (Admin Stats)...');
        const statsRes = await api.get('/admin/stats', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Admin stats retrieved:', JSON.stringify(statsRes.data.data, null, 2));

    } catch (error: any) {
        console.error('❌ Auth test failed:', error.response?.data || error.message);
    }
};

testAuth();
