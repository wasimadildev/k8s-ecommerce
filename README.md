# KindCart

KindCart is a containerized ecommerce platform with a Next.js storefront, a
modular Express API, and PostgreSQL persistence. The application is designed
to run on Kubernetes and includes health probes, rolling deployments,
persistent database storage, internal service discovery, and ingress routing.

## Architecture

```text
                           HTTPS
                             |
                     Ingress / Traefik
                             |
                    +--------+--------+
                    |                 |
              shop-web:3000     shop-api:4000
                    |                 |
                    +--------+--------+
                             |
                       PostgreSQL
                       StatefulSet
                          + PVC
```

### Repository layout

```text
.
├── api/                    # Express backend
│   ├── server.js           # Process entrypoint
│   └── src/
│       ├── app.js          # Express application wiring
│       ├── config/         # Environment-backed configuration
│       ├── controllers/    # HTTP request handlers
│       ├── db/             # PostgreSQL pool and schema initialization
│       ├── middleware/     # Shared Express middleware
│       └── routes/         # API route definitions
├── web/                    # Next.js + Tailwind CSS storefront
├── k8s/                    # Kubernetes namespace, config, workloads, and ingress
└── kind/                   # Local Kubernetes cluster configuration
```

## Requirements

- Docker
- Node.js 22 or later for local development
- Kubernetes 1.28 or later
- `kubectl`
- Helm 3
- A default Kubernetes `StorageClass` for PostgreSQL persistent volumes

For local Kubernetes deployment, this repository supports Kind. Production
deployments should use a managed Kubernetes cluster and a managed PostgreSQL
service or an operator with a documented backup and recovery policy.

## Configuration and secrets

Application configuration is provided through environment variables:

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | API listening port | `4000` |
| `PGHOST` | PostgreSQL hostname | `localhost` |
| `PGPORT` | PostgreSQL port | `5432` |
| `PGDATABASE` | PostgreSQL database name | `shop` |
| `PGUSER` | PostgreSQL username | `shop` |
| `PGPASSWORD` | PostgreSQL password | `shoplocal` |

The defaults are intended only for local development. In shared or production
environments, inject credentials through a secrets manager or Kubernetes
`Secret`; never commit real credentials to the repository. Replace the
placeholder values in [k8s/01-config.yaml](/Users/wasimadil/developer/k8s-ecommerce-lab/k8s/01-config.yaml)
before applying it to a cluster. Generate `JWT_SECRET` independently from the
database password and use a high-entropy value.

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

The storefront uses Tailwind CSS with a small application theme defined in
[tailwind.config.js](/Users/wasimadil/developer/k8s-ecommerce-lab/web/tailwind.config.js).
Global Tailwind layers and reusable form/button utilities live in
[style.css](/Users/wasimadil/developer/k8s-ecommerce-lab/web/app/style.css).
Run `npm run build` in `web` to validate the production CSS and Next.js bundle.

The API exposes:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health/live` | Liveness probe |
| `GET` | `/health/ready` | Readiness and database connectivity probe |
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
hashes. Orders accept an `Idempotency-Key` header so clients can safely retry
checkout requests. Payment, email, and shipping integrations are isolated behind provider
interfaces in `api/src/services`; the repository ships safe local adapters.
Replace those adapters with approved providers and webhook verification before
enabling live fulfillment.

## Build images

Use immutable version tags for releases rather than relying on `latest`:

```sh
docker build -t kindcart-api:v1 ./api
docker build -t kindcart-web:v2 ./web
```

For a production registry, tag images with the release version or commit SHA,
push them to the registry, and pin Kubernetes deployments to the resulting
image digest.

## Continuous integration

GitHub Actions validates both applications on pull requests and pushes to
`main`. The workflow installs locked dependencies, checks the API JavaScript
source, and builds the production Next.js application.

Pushes to `main` also build and publish the Docker images:

```text
<DOCKERHUB_USERNAME>/kindcart-api:<commit-sha>
<DOCKERHUB_USERNAME>/kindcart-web:<commit-sha>
```

The workflow also updates the `latest` tag. Configure the following repository
secrets before enabling image publishing:

- `DOCKERHUB_USERNAME`: Docker Hub account or organization name
- `DOCKERHUB_TOKEN`: Docker Hub access token with permission to push images

## Kubernetes deployment

The manifests are applied in dependency order:

```sh
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-config.yaml
kubectl apply -f k8s/02-database.yaml
kubectl -n kindcart rollout status statefulset/postgres --timeout=240s
kubectl apply -f k8s/03-api.yaml
kubectl apply -f k8s/04-web.yaml
kubectl -n kindcart rollout status deployment/shop-api --timeout=240s
kubectl -n kindcart rollout status deployment/shop-web --timeout=240s
kubectl -n kindcart get pods,services,persistentvolumeclaims
```

The API and web deployments use rolling updates. The API exposes Kubernetes
liveness and readiness probes, while PostgreSQL uses persistent storage through
its `StatefulSet` volume claim.

### Local Kind workflow

Create or select a Kind cluster, build the images, and load them into the
cluster:

```sh
kind create cluster --name kindcart --config kind/cluster.yml
kubectl config use-context kind-kindcart
kind load docker-image kindcart-api:v1 kindcart-web:v2 --name kindcart
```

If using an existing cluster, adjust the context and cluster name in the
commands above. Do not use `kind load` for a production cluster; configure the
workloads to pull from the approved container registry instead.

## Ingress

Install Traefik or use the ingress controller approved for your platform. The
repository includes an ingress manifest in [k8s/05-ingress.yaml](/Users/wasimadil/developer/k8s-ecommerce-lab/k8s/05-ingress.yaml).
For a local Kind environment:

```sh
helm repo add traefik https://traefik.github.io/charts
helm repo update
helm upgrade --install kindcart-traefik traefik/traefik \
  --namespace kindcart \
  --set ingressClass.enabled=true \
  --set ingressClass.name=traefik \
  --set providers.kubernetesIngress.enabled=true
kubectl apply -f k8s/05-ingress.yaml
```

Production ingress should terminate TLS, use a managed certificate, enforce
approved hostnames, and apply platform-standard rate limiting and access
logging.

## Verification

Check health and the product API through the configured ingress or a temporary
port-forward:

```sh
kubectl -n kindcart port-forward service/shop-api 4000:4000
curl -fsS http://127.0.0.1:4000/health/live
curl -fsS http://127.0.0.1:4000/health/ready
curl -fsS http://127.0.0.1:4000/api/products
```

Create an order using a valid product ID:

```sh
curl -fsS -X POST http://127.0.0.1:4000/api/orders \
  -H 'Content-Type: application/json' \
  -d '{"customerName":"Customer","items":[{"productId":1,"quantity":1}]}'
```

## Operations and production readiness

- Store database credentials and registry credentials in a managed secret
  system.
- Use versioned database migrations rather than applying schema changes during
  application startup.
- Use a managed PostgreSQL service or an operator that provides automated
  backups, restore testing, replication, and upgrade procedures.
- Pin container images by digest and scan images before deployment.
- Configure TLS, network policies, resource requests and limits, Pod
  disruption budgets, and appropriate RBAC for the target cluster.
- Export application, ingress, and database metrics and centralize logs.
- Define deployment rollback, incident response, data retention, and disaster
  recovery procedures.
- Run security, dependency, API, and end-to-end tests in CI before publishing
  an image.

The included manifests provide a deployment baseline. Platform-specific
security controls, observability, migration execution, and backup policies
must be supplied by the production environment.

## Cleanup

To remove the Kubernetes resources:

```sh
helm uninstall kindcart-traefik -n kindcart
kubectl delete namespace kindcart
```

Deleting the namespace also deletes namespaced resources and may delete the
database persistent volume depending on the storage reclaim policy. Confirm
backup requirements before performing this operation.
# k8s-ecommerce
