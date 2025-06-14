const { Users } = require('../models/users');

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

module.exports = { getProfile };