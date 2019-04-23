"use strict";
const https = require("https");
const nodemailer = require("nodemailer");
const config = require('./config.json');

const defaultOptions = {
    method: "GET",
    rejectUnauthorized: false,
    ecdhCurve: 'auto'
}

function check(options) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            const certInfo = res.connection.getPeerCertificate();
            const diffTime = Math.abs(new Date(certInfo.valid_to).getTime() - new Date());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const dateInfo = {
                host: options.host,
                port: options.port,
                validFrom: certInfo.valid_from,
                validTo: certInfo.valid_to,
                diffDays: diffDays
            };
            if (config.verbose) {
                console.log(dateInfo);
            }
            resolve(dateInfo);
        })
        req.on('error', (err) => {
            reject(err);
        });
        req.end();
    })
}

async function main() {
    const overdueCerts = [];

    for (let host of config.hosts) {
        // minimum of error handling
        if (!host.host) {
            throw new Error("no hostname provided");
        }

        // setting default port
        if (!host.port) {
            host.port = 443;
        }

        const options = { ...host, ...defaultOptions }


        try {
            const dateInfo = await check(options);
            if (dateInfo.diffDays < config.threshold) {
                if (config.verbose) {
                    console.log(`${options.host}:${options.port} expires in ${dateInfo.diffDays} days on ${dateInfo.validTo}`);
                }
                overdueCerts.push(dateInfo);
            }
        } catch (e) {
            console.error(`Check for ${options.host}:${options.port} failed.`)
            console.error(e);
        }

    }

    if (overdueCerts.length > 0) {
        if (config.verbose) {
            console.log("Sending mail");
        }

        const transporter = nodemailer.createTransport(config.smtp);

        let mailBody = config.email.header;

        for (let overdueCert of overdueCerts) {
            mailBody += `\t- ${overdueCert.host}:${overdueCert.port} in ${overdueCert.diffDays} days (${overdueCert.validTo})\n`
        }

        mailBody += config.email.footer;

        transporter.sendMail({
            from: config.email.fromAddr,
            to: config.email.toAddr,
            subject: config.email.subject,
            text: mailBody
        }, (err, info) => {
            if (!err) {
                if (config.verbose) {
                    console.log("Sent mail sucessfully");
                    console.log(info);
                }
            } else {
                console.error(err);
            }
        })
    }
}

main();
