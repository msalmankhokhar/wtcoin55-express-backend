require('dotenv').config();
const { testBitMartOrder, updateSpotOrder, getSpotOrder } = require('./utils/helpers');
const { SpotBalance } = require('./models/spot-balance');

/**
 * Test script for verifying balance updates
 * Usage: node test_balance_updates.js <orderId>
 */

async function testBalanceUpdates(orderId) {
    console.log(`🧪 [BALANCE_TEST] Testing balance updates for order: ${orderId}`);
    console.log(`⏰ Test started at: ${new Date().toISOString()}`);
    console.log('='.repeat(60));
    
    try {
        // Step 1: Get current balances before order processing
        console.log(`\n📋 [BALANCE_TEST] Step 1: Getting current balances...`);
        const balancesBefore = await SpotBalance.find({}).sort({ coinName: 1 });
        console.log(`📊 [BALANCE_TEST] Current balances:`);
        balancesBefore.forEach(balance => {
            console.log(`   ${balance.coinName}: ${balance.balance}`);
        });
        
        // Step 2: Test the order processing
        console.log(`\n📋 [BALANCE_TEST] Step 2: Processing order...`);
        const orderDetails = await getSpotOrder(orderId);
        console.log(`📊 [BALANCE_TEST] Order details:`, {
            orderId: orderDetails.orderId,
            symbol: orderDetails.symbol,
            state: orderDetails.state,
            side: orderDetails.side,
            filledSize: orderDetails.filledSize,
            executionPrice: orderDetails.executionPrice,
            exchangeFees: orderDetails.exchangeFees,
            needsUpdate: orderDetails.needsUpdate
        });
        
        if (orderDetails.needsUpdate) {
            console.log(`🔄 [BALANCE_TEST] Order needs update, processing...`);
            const updatedOrder = await updateSpotOrder(orderDetails);
            console.log(`✅ [BALANCE_TEST] Order updated:`, {
                status: updatedOrder?.status,
                executedQuantity: updatedOrder?.executedQuantity,
                averageExecutionPrice: updatedOrder?.averageExecutionPrice,
                totalFees: updatedOrder?.totalFees
            });
        } else {
            console.log(`⏭️ [BALANCE_TEST] Order doesn't need update`);
        }
        
        // Step 3: Get balances after order processing
        console.log(`\n📋 [BALANCE_TEST] Step 3: Getting balances after processing...`);
        const balancesAfter = await SpotBalance.find({}).sort({ coinName: 1 });
        console.log(`📊 [BALANCE_TEST] Balances after processing:`);
        balancesAfter.forEach(balance => {
            console.log(`   ${balance.coinName}: ${balance.balance}`);
        });
        
        // Step 4: Calculate balance changes
        console.log(`\n📋 [BALANCE_TEST] Step 4: Calculating balance changes...`);
        const balanceChanges = [];
        
        balancesAfter.forEach(afterBalance => {
            const beforeBalance = balancesBefore.find(b => b.coinName === afterBalance.coinName);
            const beforeAmount = beforeBalance ? beforeBalance.balance : 0;
            const change = afterBalance.balance - beforeAmount;
            
            if (change !== 0) {
                balanceChanges.push({
                    coinName: afterBalance.coinName,
                    before: beforeAmount,
                    after: afterBalance.balance,
                    change: change,
                    changeType: change > 0 ? 'ADDED' : 'DEDUCTED'
                });
            }
        });
        
        if (balanceChanges.length > 0) {
            console.log(`✅ [BALANCE_TEST] Balance changes detected:`);
            balanceChanges.forEach(change => {
                console.log(`   ${change.coinName}: ${change.before} → ${change.after} (${change.changeType} ${Math.abs(change.change)})`);
            });
        } else {
            console.log(`⚠️ [BALANCE_TEST] No balance changes detected`);
        }
        
        // Step 5: Verify the changes make sense
        if (orderDetails.symbol && orderDetails.side && orderDetails.filledSize) {
            console.log(`\n📋 [BALANCE_TEST] Step 5: Verifying changes...`);
            const [baseCurrency, quoteCurrency] = orderDetails.symbol.split('_');
            const executedQuantity = parseFloat(orderDetails.filledSize);
            const executionPrice = parseFloat(orderDetails.executionPrice);
            const fees = parseFloat(orderDetails.exchangeFees || 0);
            
            console.log(`📊 [BALANCE_TEST] Expected changes for ${orderDetails.side.toUpperCase()} order:`);
            if (orderDetails.side === 'buy') {
                console.log(`   +${executedQuantity} ${baseCurrency} should be added`);
                console.log(`   -${(executedQuantity * executionPrice) + fees} ${quoteCurrency} should be deducted (including ${fees} fees)`);
            } else if (orderDetails.side === 'sell') {
                console.log(`   -${executedQuantity} ${baseCurrency} should be deducted`);
                console.log(`   +${(executedQuantity * executionPrice) - fees} ${quoteCurrency} should be added (after ${fees} fees)`);
            }
        }
        
    } catch (error) {
        console.error('❌ [BALANCE_TEST] Test failed:', error);
    }
    
    console.log('='.repeat(60));
    console.log(`⏰ Test completed at: ${new Date().toISOString()}`);
}

async function main() {
    const orderId = process.argv[2];
    
    if (!orderId) {
        console.log('❌ Please provide an order ID as an argument');
        console.log('Usage: node test_balance_updates.js <orderId>');
        console.log('Example: node test_balance_updates.js 123456789');
        process.exit(1);
    }
    
    await testBalanceUpdates(orderId);
}

// Run the test
main().catch(console.error); 