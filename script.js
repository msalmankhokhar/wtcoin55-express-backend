const mongoose = require('mongoose');
const SpotBalance = require('./models/spot-balance');
const FuturesBalance = require('./models/futures-balance');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
});

const updateRequiredVolume = async () => {
    const spotBalance = await SpotBalance.find({});
    const futuresBalance = await FuturesBalance.find({});

    futuresBalance.forEach(async (balance) => {
        console.log(`Futures ${balance.coinName} ${balance.balance}`);
        if (balance.requiredVolume <= 0){   
            const requiredVolume = balance.balance * 2;
            await FuturesBalance.findByIdAndUpdate(balance._id, { requiredVolume });
        }
    });

    spotBalance.forEach(async (balance) => {
        console.log(`Spot ${balance.coinName} ${balance.balance}`);
        if (balance.requiredVolume <= 0){   
            const requiredVolume = balance.balance * 2;
            await SpotBalance.findByIdAndUpdate(balance._id, { requiredVolume });
        }
    });
}

updateRequiredVolume();
console.log('Required volume updated');


