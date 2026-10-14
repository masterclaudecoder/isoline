# Feedback endpoint

A Cloudflare Worker that creates a GitHub issue from the app's feedback form, so people don't need a
GitHub account. The app posts to it when `FEEDBACK_URL` in `app.js` is set, and falls back to a
filled-in GitHub issue page otherwise.

1. Make a fine-grained GitHub token for this repository only, with **Issues: Read and write**.
2. Install Wrangler and sign in: `npm i -g wrangler`, then `wrangler login`.
3. From this folder: `wrangler deploy feedback.js --name isoline-feedback --compatibility-date 2024-09-01`
4. Add the token as a secret: `wrangler secret put GITHUB_TOKEN --name isoline-feedback`
5. Put the worker's address (like `https://isoline-feedback.<you>.workers.dev`) in `FEEDBACK_URL` in
   `app.js` and push.

The worker accepts requests only from the site's own address, ignores a hidden honeypot field, and
allows five reports per address every ten minutes.
