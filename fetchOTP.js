const express = require('express');
const { chromium } = require('playwright');
const fs = require('fs').promises; // Using promises version of fs for async file reading
const fetch = require('node-fetch');

const app = express();
const port = 3000;

let emails = [];
let currentIndex = 0;


// Endpoint to get email ID
app.get('/emailid', (req, res) => {
    if (currentIndex < emails.length) {
        const email = emails[currentIndex++];
        console.log(email);
        res.send(email);
    } else {
        res.status(404).send('No more email IDs available');
    }
});

// Endpoint to fetch OTP
app.get('/otp', async (req, res) => {
    if (currentIndex > 0 && currentIndex <= emails.length) {
        const emailId = emails[currentIndex - 1];
        const otp = await fetchOTP(emailId);
        res.send(otp);
    } else {
        res.status(404).send('No email ID available');
    }
});

// Endpoint to decrement the email array index
app.get('/indexback', (req, res) => {
    if (currentIndex > 0) {
        currentIndex--; // Decrement the index
        res.status(200).send('Index decremented successfully.');
    } else {
        res.status(404).send('Index is already at the beginning.');
    }
});

async function fetchOTP(emailId) {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    try {
        await page.goto(`https://generator.email/${emailId}`);

        // Check if the email table is present, if not, wait for a short time to load
        await page.waitForSelector('#email-table', { timeout: 5000 }).catch(() => {}); // Short timeout

        // Attempt to fetch the OTP directly from the email content
        const otp = await page.evaluate(() => {
            const emailContent = document.querySelector('#email-table').textContent;
            const otpMatch = emailContent.match(/Your confirmation code is: (\d{6})/); // Matching 6 digits as OTP
            if (otpMatch && otpMatch[1]) {
                return otpMatch[1];
            }
            return null;
        });

        return otp;
    } catch (error) {
        console.error(`Error occurred while fetching OTP for ${emailId}: ${error}`);
        return null;
    } finally {
        await browser.close();
    }
}

app.listen(port, async () => {
    console.log(`Server running at http://localhost:${port}`);

    try {
        const emailList = await fs.readFile('emails.txt', 'utf8');
        emails = emailList.trim().split('\n');
        console.log(emails);
    } catch (error) {
        console.error('Error reading email list:', error);
    }
});
