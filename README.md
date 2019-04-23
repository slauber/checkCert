checkCert
=========
A simple script for sending mails, when your certificates expire.

Usage
------
- Clone and `npm i`.
- `cp config.sample.json config.json` and adapt to your needs (SMTP credentials, hosts to check, verbosity (console logs), and threshold in days)
- Set up a cronjob to run repeatedly (run `npm start` or `node .` in working directory)