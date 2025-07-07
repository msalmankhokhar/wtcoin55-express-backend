const mongoose = require('mongoose');
const { Logs } = require('./models/logs');

// Test the logging system
async function testLogging() {
    try {
        console.log('🧪 Testing logging system...');
        
        // Test valid action values
        const validActions = [
            'login_success',
            'login_failed',
            'login_attempt',
            'admin_user_management',
            'admin_balance_update',
            'user_action',
            'user_trading_action',
            'system_error'
        ];
        
        for (const action of validActions) {
            try {
                const testLog = new Logs({
                    userRole: 'guest',
                    method: 'GET',
                    endpoint: '/test',
                    fullUrl: 'http://localhost:3000/test',
                    ipAddress: '127.0.0.1',
                    statusCode: 200,
                    action: action,
                    description: `Test log for ${action}`
                });
                
                await testLog.save();
                console.log(`✅ Successfully created log with action: ${action}`);
                
                // Clean up test log
                await Logs.findByIdAndDelete(testLog._id);
                
            } catch (error) {
                console.error(`❌ Failed to create log with action: ${action}`, error.message);
            }
        }
        
        // Test invalid action (should fail)
        try {
            const invalidLog = new Logs({
                userRole: 'guest',
                method: 'GET',
                endpoint: '/test',
                fullUrl: 'http://localhost:3000/test',
                ipAddress: '127.0.0.1',
                statusCode: 200,
                action: 'invalid_action',
                description: 'This should fail'
            });
            
            await invalidLog.save();
            console.log('❌ Invalid action was accepted (this should not happen)');
        } catch (error) {
            console.log('✅ Invalid action correctly rejected:', error.message);
        }
        
        console.log('🎉 Logging system test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run test if this file is executed directly
if (require.main === module) {
    // Connect to MongoDB
    mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/quantum-exchange', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then(() => {
        console.log('📦 Connected to MongoDB');
        return testLogging();
    }).then(() => {
        console.log('✅ Test completed successfully');
        process.exit(0);
    }).catch((error) => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
}

module.exports = { testLogging }; 