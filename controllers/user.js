const { Users } = require('../models/users');
const { MainBalance } = require('../models/balance');

const getProfile = async (req, res) => {
    console.log(req.user);
    let user = await Users.findOne({ _id: req.user._id }, { password: 0 });
    const referrals = await Users.find({ referBy: req.user.refCode }, { _id: 1, email: 1, name: 1 });
    const referralCount = referrals.length;
    
    // Convert to plain object
    const userObj = user.toObject();
    userObj.referrals = referrals;
    userObj.referralCount = referralCount;

    return res.status(200).json(userObj);
};


const getBalance = async (req, res) => {
    try {
        const balance = await MainBalance.find({ user: req.user._id });

        if (balance.length === 0) {
            const usdtBalance = await MainBalance({
                user: req.user._id,
                coinId: 1280,
                coinName: 'USDT',
                balance: 0
            });
            await usdtBalance.save();

            return res.status(200).json({msg: "success", balance: [usdtBalance]});
        }

        return res.status(200).json({msg: "success", balance});
    } catch (error) {
        console.error('Error retrieving balance:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = { getProfile, getBalance };
