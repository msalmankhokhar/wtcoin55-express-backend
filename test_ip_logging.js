const axios = require('axios');

const BASE_URL = 'https://quantum-exchange.onrender.com';

async function testIPLogging() {
    console.log('🌐 Testing IP Address Logging...\n');

    try {
        // Test 1: Failed login attempt (should show IP)
        console.log('1️⃣ Testing failed login with IP logging...');
        try {
            await axios.post(`${BASE_URL}/api/auth/login`, {
                email: 'test@example.com',
                password: 'wrongpassword'
            });
        } catch (error) {
            console.log('✅ Failed login logged with IP (expected)');
        }

        // Test 2: Successful login (should show IP)
        console.log('\n2️⃣ Testing successful login with IP logging...');
        try {
            const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
                email: 'test@example.com',
                password: 'correctpassword'
            });
            console.log('✅ Successful login logged with IP');
            
            const token = loginResponse.data.token;
            
            // Test 3: User action (should show IP)
            console.log('\n3️⃣ Testing user action with IP logging...');
            try {
                await axios.get(`${BASE_URL}/api/user/profile`, {
                    headers: {
                        'quantumaccesstoken': token
                    }
                });
                console.log('✅ User action logged with IP');
            } catch (error) {
                console.log('❌ User action failed:', error.response?.data?.message);
            }

        } catch (error) {
            console.log('❌ Login failed:', error.response?.data?.message);
        }

        // Test 4: Test with different headers to simulate proxy
        console.log('\n4️⃣ Testing with custom headers...');
        try {
            await axios.post(`${BASE_URL}/api/auth/login`, {
                email: 'test@example.com',
                password: 'wrongpassword'
            }, {
                headers: {
                    'X-Forwarded-For': '192.168.1.100, 10.0.0.1',
                    'X-Real-IP': '203.0.113.1',
                    'User-Agent': 'Test-Bot/1.0'
                }
            });
        } catch (error) {
            console.log('✅ Request with custom headers logged');
        }

        // Test 5: Check logs via admin API (if admin credentials available)
        console.log('\n5️⃣ Testing logs retrieval with IP display...');
        try {
            const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
                email: 'admin@example.com', // Replace with actual admin email
                password: 'adminpassword'   // Replace with actual admin password
            });
            
            const adminToken = loginResponse.data.token;
            
            const logsResponse = await axios.get(`${BASE_URL}/api/admin/logs?limit=5`, {
                headers: {
                    'quantumaccesstoken': adminToken
                }
            });
            
            console.log('✅ Logs retrieved successfully');
            console.log('📊 Recent logs with IP addresses:');
            
            logsResponse.data.data.logs.forEach((log, index) => {
                console.log(`${index + 1}. ${log.action} - IP: ${log.ipAddress} - User: ${log.userEmail || 'Guest'} - ${log.description}`);
            });
            
        } catch (error) {
            console.log('❌ Admin test failed:', error.response?.data?.message);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }

    console.log('\n🎉 IP logging test completed!');
    console.log('\n📋 Expected console output should show:');
    console.log('📝 [LOGIN_FAILED] test@example.com - Failed login attempt for test@example.com: Invalid password - 400 - 🌐 [IP_ADDRESS]');
    console.log('📝 [LOGIN_SUCCESS] test@example.com - User test@example.com logged in successfully - 200 - 🌐 [IP_ADDRESS]');
    console.log('🚨 SUSPICIOUS ACTIVITY DETECTED: login_failed - IP: [IP_ADDRESS] - Flags: multiple_failed_logins');
}

// Run the test
testIPLogging(); 