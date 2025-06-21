const BitMart = require('./utils/bitmart');

const bitmart = new BitMart(
    process.env.BITMART_API_KEY,
    process.env.BITMART_API_SECRET,
    process.env.BITMART_API_MEMO,
    process.env.BITMART_BASE_URL
);

async function testMinOrderSizes() {
    console.log('🧪 Testing minimum order sizes...\n');
    
    const symbols = ['ETH_USDT', 'BTC_USDT', 'BNB_USDT', 'ADA_USDT'];
    
    for (const symbol of symbols) {
        console.log(`📊 Checking ${symbol}...`);
        
        try {
            const details = await bitmart.getTradingPairDetails(symbol);
            
            if (details.code === 1000 && details.data) {
                const pair = details.data;
                console.log(`✅ ${symbol}:`);
                console.log(`   Min Size: ${pair.min_size}`);
                console.log(`   Max Size: ${pair.max_size}`);
                console.log(`   Price Precision: ${pair.price_precision}`);
                console.log(`   Size Precision: ${pair.size_precision}`);
                console.log(`   Status: ${pair.status}`);
                console.log('');
            } else {
                console.log(`❌ Failed to get details for ${symbol}: ${details.message}`);
                console.log('');
            }
        } catch (error) {
            console.log(`❌ Error checking ${symbol}: ${error.message}`);
            console.log('');
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('✅ Testing completed');
}

// Test with a small order to see the exact error
async function testSmallOrder() {
    console.log('\n🧪 Testing small order submission...\n');
    
    const symbol = 'ETH_USDT';
    const side = 'buy';
    const type = 'market';
    const quantity = 0.0005; // Very small quantity
    
    console.log(`📋 Submitting order: ${side} ${quantity} ${symbol} (${type})`);
    
    try {
        const result = await bitmart.submitSpotOrder(symbol, side, type, quantity);
        console.log('📊 Result:', result);
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
}

// Run tests
async function runTests() {
    await testMinOrderSizes();
    await testSmallOrder();
}

runTests().catch(console.error); 