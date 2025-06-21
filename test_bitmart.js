require('dotenv').config();
const { testBitMartOrder, testMultipleOrders } = require('./utils/helpers');

/**
 * Test script for debugging BitMart order tracking
 * Usage: node test_bitmart.js <orderId>
 */

async function main() {
    const orderId = process.argv[2];
    
    if (!orderId) {
        console.log('❌ Please provide an order ID as an argument');
        console.log('Usage: node test_bitmart.js <orderId>');
        console.log('Example: node test_bitmart.js 123456789');
        process.exit(1);
    }
    
    console.log(`🧪 Starting BitMart order test for: ${orderId}`);
    console.log(`⏰ Test started at: ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    
    try {
        await testBitMartOrder(orderId);
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
    
    console.log('='.repeat(60));
    console.log(`⏰ Test completed at: ${new Date().toISOString()}`);
}

// Run the test
main().catch(console.error); 