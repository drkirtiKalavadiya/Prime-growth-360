# Saragvo: moringa storefront

A single-file, dependency-free e-commerce site (`index.html`). Open it in a browser or deploy it to any static host
(Netlify, Vercel, GitHub Pages, cPanel).

## Features
- **Language and theme:** English / ગુજરાતી switch, light / dark theme. Both choices are remembered.
- **Shop:** filter by category, live search, sort, size selector, discount %, and cost per day.
- **Quick view:** sizes, quantity, subscribe & save 10% (every 30/45/60 days), and Buy now.
- **Cart drawer:** quantity stepper, a free-shipping progress bar (above ₹499) and coupons (`WELCOME10`, and `SARAGVO15` on orders above ₹999).
- **Ritual builder:** pick any 3 products for 15% off.
- **Wishlist and recently viewed.** The cart, wishlist and address are kept in the browser.
- **Nutrition:** a nutrition facts label that switches between a 5 g serving and 100 g, plus a "how long will a pack last" calculator.
- **Content sections:** farm process, recipes, reviews, FAQ and newsletter signup.
- **Product images:** original SVG illustrations. The hero has an animated canvas of moringa fronds.

## Payment
The checkout validates name, mobile number (10 digits, starting 6–9) and 6-digit PIN code, and shows a **Pay** button.
No payment method is connected: pressing Pay charges nothing, says so, and builds an order request the customer can copy
and send on WhatsApp.

To go live, connect a gateway (e.g. Razorpay Checkout). Replace the code after the
`// Payment button exists but no payment method is connected` comment with the gateway call, and create orders on a server.

## Before launch
- Replace the example prices, the contact email and WhatsApp number, and the FSSAI licence number.
- Replace the **sample reviews** with real ones.
- Check the nutrition values against your batch lab report.
- Product photos: swap `productArt(p)` for `<img>` tags pointing to your own photos.
