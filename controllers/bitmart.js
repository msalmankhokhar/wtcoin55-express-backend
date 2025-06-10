const express = require('express');
const BitMart = require('../utils/bitmart');
const { SpotBalance } = require('../models/spot-balance');
const { FuturesBalance } = require('../models/futures-balance');


// Get the BitMart API variables
const { BITMART_API_KEY, BITMART_API_SECRET, BITMART_API_MEMO, BITMART_BASE_URL } = process.env;

// Create a new instance of BitMart API client
const bitmart = new BitMart(
    BITMART_API_KEY,
    BITMART_API_SECRET,
    BITMART_API_MEMO,
    BITMART_BASE_URL
);

console.log(bitmart);

// Funtions to handle BitMart API requests
// Wallet Transfer Controller
// This controller handles wallet transfers for BitMart, including spots and futures using Bitmart apis
// 
// Hnadle Futures Initialization with Bitmart API
// Hnadle Futures Initialization with SPot API
// HANDLE SPOT AND FUTURES TRANSFERS


// Get a list of all trading pairs on the platform
async function getTradingPairs(req, res) {
    try {
        const pairs = await bitmart.getAllTradingPairs();
        res.status(200).json(pairs);
    } catch (error) {
        console.error('Error fetching trading pairs:', error);
        res.status(500).json({ error: 'Failed to fetch trading pairs' });
    }
};


async function getAllCurrency(req, res) {
    try {
        const currencies = await bitmart.getAllCurrencies();
        return currencies;
    } catch (error) {
        console.error('Error fetching all currencies:', error);
        throw new Error('Failed to fetch all currencies');
    }
}

async function getDepositAddress(req, res) {
    const { currency } = req.query;
    try {
        const address = await bitmart.getDepositAddress(currency);
        res.status(200).json(address);
    } catch (error) {
        console.error('Error fetching deposit address:', error);
        res.status(500).json({ error: 'Failed to fetch deposit address' });
    }
}

async function getSpotWalletBalance(req, res) {
    try {
        const user = req.user;
        const coinId = req.params.coinId || "";
        let balance

        if (coinId !== "") {
            balance = await SpotBalance.findOne({ user: user._id, coinId })
        } else {
            balance = await SpotBalance.find({ user: user._id})
        }
        res.status(200).json(balance);
    } catch (error) {
        console.error('Error fetching spot balance:', error);
        res.status(500).json({ error: 'Failed to fetch spot balance' });
    }
}

async function getFuturesWalletBalance(req, res) {
    try {
        const user = req.user;
        const coinId = req.params.coinId || "";
        let balance

        if (coinId !== "") {
            balance = await FuturesBalance.findOne({ user: user._id, coinId })
        } else {
            balance = await FuturesBalance.find({ user: user._id})
        }
        res.status(200).json(balance);
    } catch (error) {
        console.error('Error fetching spot balance:', error);
        res.status(500).json({ error: 'Failed to fetch spot balance' });
    }
}

module.exports = { 
    getTradingPairs,
    getAllCurrency,
    getDepositAddress,
    getFuturesWalletBalance,
    getSpotWalletBalance
}
