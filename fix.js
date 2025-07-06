const fs = require('fs');

// Load and parse the JSON file
const rawData = fs.readFileSync('bitmart.json', 'utf-8');
const parsedData = JSON.parse(rawData);

// Safely access the currencies array
const currencies = parsedData.currencies || [];

const filtered = currencies.filter(currency => {
    return currency.deposit_enabled === true && currency.withdraw_enabled === true;
});

// Log each valid currency and write to output file
filtered.forEach(currency => {
    console.log(`✅ Added: ${currency.currency} on ${currency.network}`);
});

// Write filtered data to filtered_bitmart.json
fs.writeFileSync('filtered_bitmart.json', JSON.stringify(filtered, null, 2));

console.log(`\n✅ Total filtered: ${filtered.length} saved to filtered_bitmart.json`);
