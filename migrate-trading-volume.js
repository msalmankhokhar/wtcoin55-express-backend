const mongoose = require('mongoose');
const SpotBalance = require('./models/spot-balance');
const FuturesBalance = require('./models/futures-balance');
const TradingVolume = require('./models/tradingVolume');
const { getOrCreateTradingVolume, setRequiredVolume } = require('./utils/tradingVolume');
require('dotenv').config();

/**
 * Migration script to transition from individual balance trading volumes 
 * to unified TradingVolume system
 */
async function migrateTradingVolume() {
    try {
        console.log('🚀 Starting trading volume migration...');

        // Connect to MongoDB
        console.log(process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Get all spot balances
        const spotBalances = await SpotBalance.find({});
        console.log(`📊 Found ${spotBalances.length} spot balances to migrate`);

        // Get all futures balances
        const futuresBalances = await FuturesBalance.find({});
        console.log(`📊 Found ${futuresBalances.length} futures balances to migrate`);

        // Process spot balances
        for (const balance of spotBalances) {
            try {
                // Get or create trading volume record
                const tradingVolume = await getOrCreateTradingVolume(
                    balance.user, 
                    balance.coinId, 
                    balance.coinName
                );

                // Set required volume if it exists
                if (balance.requiredVolume) {
                    await setRequiredVolume(balance.user, balance.coinId, balance.requiredVolume);
                }

                // Link balance to trading volume
                await SpotBalance.findByIdAndUpdate(balance._id, {
                    tradingVolumeId: tradingVolume._id,
                    updatedAt: new Date()
                });

                console.log(`✅ Migrated spot balance for user ${balance.user}, coin ${balance.coinId}`);
            } catch (error) {
                console.error(`❌ Error migrating spot balance ${balance._id}:`, error);
            }
        }

        // Process futures balances
        for (const balance of futuresBalances) {
            try {
                // Get or create trading volume record
                const tradingVolume = await getOrCreateTradingVolume(
                    balance.user, 
                    balance.coinId, 
                    balance.coinName
                );

                // Set required volume if it exists
                if (balance.requiredVolume) {
                    await setRequiredVolume(balance.user, balance.coinId, balance.requiredVolume);
                }

                // Link balance to trading volume
                await FuturesBalance.findByIdAndUpdate(balance._id, {
                    tradingVolumeId: tradingVolume._id,
                    updatedAt: new Date()
                });

                console.log(`✅ Migrated futures balance for user ${balance.user}, coin ${balance.coinId}`);
            } catch (error) {
                console.error(`❌ Error migrating futures balance ${balance._id}:`, error);
            }
        }

        console.log('🎉 Trading volume migration completed successfully!');

        // Disconnect from MongoDB
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    migrateTradingVolume();
}

module.exports = { migrateTradingVolume }; 