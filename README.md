# MRS Smart Finds

A responsive affiliate product-discovery website with a Node.js backend for retailer image and price lookups.

## Deploy on Render (Web Service)

Connect this GitHub repository to Render and use:

- **Service type:** Web Service
- **Runtime:** Node
- **Branch:** `main`
- **Root directory:** leave blank
- **Build command:** `npm install`
- **Start command:** `npm start`
- **Instance type:** Free, if available in your Render account

Render provides the `PORT` environment variable. The server listens on `0.0.0.0` and serves the website plus API routes.

## API routes

- `/api/product-image?url=...` — looks for a product image on an approved retailer listing and redirects to it.
- `/api/product-price?url=...` — reads structured product price metadata and returns the amount and currency when available.
- `/health` — health check.

Supported retailer hosts: Amazon, Star Tech, ShopZ, Releva and Illin (including their www hostnames).

## Notes

- Retailers can block automated requests or omit structured price/image metadata. In those cases, the page shows an unavailable state; it does not invent prices or product photos.
- Retailers control prices, stock, delivery, returns and fulfilment. Confirm details on the retailer's current listing before purchasing.
- Affiliate links are disclosed on the website.
- Node.js 20 or newer is required.
