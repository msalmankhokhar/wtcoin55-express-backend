const BitMart = require('./utils/bitmart');

// Create BitMart instance with test credentials
const bitmart = new BitMart(
    process.env.BITMART_API_KEY,
    process.env.BITMART_API_SECRET,
    process.env.BITMART_API_MEMO,
    process.env.BITMART_BASE_URL
);

async function testErrorHandling() {
    console.log('🧪 Testing BitMart Error Handling...\n');

    try {
        // Test 1: Try to submit an order with invalid symbol
        console.log('📋 Test 1: Invalid symbol');
        await bitmart.submitSpotOrder('INVALID_SYMBOL', 'buy', 'limit', '1000', '0.001');
    } catch (error) {
        console.log(`✅ Error handled correctly:`);
        console.log(`   Status Code: ${error.statusCode || 'Not set'}`);
        console.log(`   Message: ${error.message}`);
        console.log(`   BitMart Code: ${error.bitmartCode || 'Not set'}`);
        console.log(`   Error Type: ${error.name}\n`);
    }

    try {
        // Test 2: Try to submit an order with size too small
        console.log('📋 Test 2: Size too small');
        await bitmart.submitSpotOrder('BTC_USDT', 'sell', 'market', null, '0.000001');
    } catch (error) {
        console.log(`✅ Error handled correctly:`);
        console.log(`   Status Code: ${error.statusCode || 'Not set'}`);
        console.log(`   Message: ${error.message}`);
        console.log(`   BitMart Code: ${error.bitmartCode || 'Not set'}`);
        console.log(`   Error Type: ${error.name}\n`);
    }

    try {
        // Test 3: Try to submit an order with invalid API credentials
        console.log('📋 Test 3: Invalid API credentials');
        const invalidBitmart = new BitMart('invalid', 'invalid', 'invalid', process.env.BITMART_BASE_URL);
        await invalidBitmart.submitSpotOrder('BTC_USDT', 'buy', 'limit', '1000', '0.001');
    } catch (error) {
        console.log(`✅ Error handled correctly:`);
        console.log(`   Status Code: ${error.statusCode || 'Not set'}`);
        console.log(`   Message: ${error.message}`);
        console.log(`   BitMart Code: ${error.bitmartCode || 'Not set'}`);
        console.log(`   Error Type: ${error.name}\n`);
    }

    console.log('🎉 Error handling test completed!');
}

// Run the test
testErrorHandling().catch(console.error); 