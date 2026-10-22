# KindCart

KindCart is an ecommerce application with a Next.js storefront, an Express
API, and PostgreSQL persistence.

## Repository layout

```text
.
├── api/                    # Express backend and PostgreSQL integration
└── web/                    # Next.js + Tailwind CSS storefront
```

## Requirements

- Node.js 22 or later
- PostgreSQL

## Configuration

The API reads the following environment variables:

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | API listening port | `4000` |
| `PGHOST` | PostgreSQL hostname | `localhost` |
| `PGPORT` | PostgreSQL port | `5432` |
| `PGDATABASE` | PostgreSQL database name | `shop` |
| `PGUSER` | PostgreSQL username | `shop` |
| `PGPASSWORD` | PostgreSQL password | `shoplocal` |
| `JWT_SECRET` | Secret used to sign access tokens | local development value |

Set production credentials through the environment rather than committing
secret values to the repository.

## Local development

Start the API:

```sh
cd api
npm install
npm run dev
```

Start the storefront in a second terminal:

```sh
cd web
npm install
npm run dev
```

The storefront proxies `/api` requests to `http://localhost:4000` by default.
Set `API_INTERNAL_URL` when the API is hosted at a different address.

Run the production storefront build with:

```sh
cd web
npm run build
```

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health/live` | Liveness status |
| `GET` | `/health/ready` | Database connectivity status |
| `GET` | `/api/products` | List products |
| `GET` | `/api/orders` | List the latest orders |
| `POST` | `/api/orders` | Create an order and reserve stock |
| `POST` | `/api/auth/register` | Register a customer account |
| `POST` | `/api/auth/login` | Sign in and receive an access token |
| `GET` | `/api/auth/me` | Return the authenticated account |
| `GET` | `/api/cart` | Read the authenticated customer cart |
| `PUT` | `/api/cart` | Replace the authenticated customer cart |
| `POST` | `/api/products` | Create a product as an administrator |
| `PUT` | `/api/products/:id` | Update a product as an administrator |

Order creation validates the customer and cart, locks products during the
transaction, verifies stock, writes the order and line items, and decrements
inventory atomically.

Authentication uses short-lived signed access tokens and scrypt password
hashes. Payment, email, and shipping integrations are isolated behind provider
interfaces in `api/src/services`; the repository ships safe local adapters.
