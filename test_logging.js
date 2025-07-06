const axios = require('axios');

const BASE_URL = 'https://quantum-exchange.onrender.com';

async function testLogging() {
    console.log('🧪 Testing Logging System...\n');

    try {
        // Test 1: Failed login attempt (should be logged)
        console.log('1️⃣ Testing failed login...');
        try {
            await axios.post(`${BASE_URL}/api/auth/login`, {
                email: 'test@example.com',
                password: 'wrongpassword'
            });
        } catch (error) {
            console.log('✅ Failed login logged (expected)');
        }

        // Test 2: Successful login (should be logged)
        console.log('\n2️⃣ Testing successful login...');
        try {
            const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
                email: 'test@example.com',
                password: 'correctpassword'
            });
            console.log('✅ Successful login logged');
            
            const token = loginResponse.data.token;
            
            // Test 3: Admin action (if user is admin)
            if (loginResponse.data.user.isAdmin) {
                console.log('\n3️⃣ Testing admin action...');
                try {
                    await axios.get(`${BASE_URL}/api/admin/users`, {
                        headers: {
                            'quantumaccesstoken': token
                        }
                    });
                    console.log('✅ Admin action logged');
                } catch (error) {
                    console.log('❌ Admin action failed:', error.response?.data?.message);
                }
            }

            // Test 4: User action
            console.log('\n4️⃣ Testing user action...');
            try {
                await axios.get(`${BASE_URL}/api/user/profile`, {
                    headers: {
                        'quantumaccesstoken': token
                    }
                });
                console.log('✅ User action logged');
            } catch (error) {
                console.log('❌ User action failed:', error.response?.data?.message);
            }

        } catch (error) {
            console.log('❌ Login failed:', error.response?.data?.message);
        }

        // Test 5: Check logs (if admin)
        console.log('\n5️⃣ Testing logs retrieval...');
        try {
            const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
                email: 'admin@example.com', // Replace with actual admin email
                password: 'adminpassword'   // Replace with actual admin password
            });
            
            const adminToken = loginResponse.data.token;
            
            const logsResponse = await axios.get(`${BASE_URL}/api/admin/logs?limit=10`, {
                headers: {
                    'quantumaccesstoken': adminToken
                }
            });
            
            console.log('✅ Logs retrieved successfully');
            console.log(`📊 Found ${logsResponse.data.data.logs.length} logs`);
            
            // Test 6: Check suspicious activities
            console.log('\n6️⃣ Testing suspicious activities...');
            const suspiciousResponse = await axios.get(`${BASE_URL}/api/admin/logs/suspicious?limit=5`, {
                headers: {
                    'quantumaccesstoken': adminToken
                }
            });
            
            console.log('✅ Suspicious activities retrieved');
            console.log(`🚨 Found ${suspiciousResponse.data.data.length} suspicious activities`);
            
            // Test 7: Check activity stats
            console.log('\n7️⃣ Testing activity statistics...');
            const statsResponse = await axios.get(`${BASE_URL}/api/admin/logs/stats`, {
                headers: {
                    'quantumaccesstoken': adminToken
                }
            });
            
            console.log('✅ Activity statistics retrieved');
            console.log(`📈 Stats:`, statsResponse.data.data);
            
        } catch (error) {
            console.log('❌ Admin tests failed:', error.response?.data?.message);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }

    console.log('\n🎉 Logging system test completed!');
}

// Run the test
testLogging(); 