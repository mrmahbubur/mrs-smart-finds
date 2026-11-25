# MRS Smart Finds

A responsive, multilingual affiliate product-discovery website with nine visual product-category browsers, product search and a Node.js backend for retailer image and price lookups.

## Render Web Service deployment

Connect this repository to Render and configure:

- Service type: Web Service
- Runtime: Node
- Branch: `main`
- Root directory: blank
- Build command: `npm install`
- Start command: `npm start`
- Instance: Free, if available in your Render account

Render supplies `PORT`; the server listens on `0.0.0.0`.

## Catalogue features

- Nine visual categories: Audio, Beauty, Electronics, Fashion, Home & lifestyle, Lighting, Personal care, Photo & video, and Watches.
- Category cards appear on the homepage and product-search page.
- Selecting a homepage category opens the product-search page with that category preselected.
- Responsive category thumbnails, product counts and category filtering.
- Interface translations: English, Bengali, Hindi, Spanish and Arabic.

## API routes

- `/api/product-image?url=...` — retrieves an image URL from an approved retailer product page and redirects to it.
- `/api/product-price?url=...` — reads structured price metadata and returns amount and currency when available.
- `/health` — health check.

Supported hosts: Amazon, Star Tech, ShopZ, Releva and Illin.

Retailers may block automated requests or omit product metadata. In those cases the site shows an unavailable state instead of inventing a price or image. Confirm current product details with the retailer. Affiliate links are disclosed on the website. Node.js 20 or newer is required.
