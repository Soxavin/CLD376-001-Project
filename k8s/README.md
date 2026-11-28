# Kubernetes (final project)

Everything here is plain YAML, applied with `kubectl apply -f`. The cluster is Minikube on one laptop.

## Who writes what

| Folder | Owner | Contents |
| --- | --- | --- |
| `api-gateway/`, `booking/`, `vehicles/` | Member 1 | `deployment.yaml`, `service.yaml` |
| `ingress/` | Member 1 | `ingress.yaml` (fanout on `carrepair.com`) |
| `registration/`, `work-orders/`, `repair-notes/` | Member 2 | `deployment.yaml`, `service.yaml` |
| `config/` | Member 2 | `configmap.yaml`, `secret.example.yaml` |
| `login/`, `billing/`, `service-catalog/` | Member 3 | `deployment.yaml`, `service.yaml` |
| `storage/` | Member 3 | `pvc.yaml`, `permissions-job.yaml` |
| `log-viewer/` | Member 3 | `configmap.yaml`, `deployment.yaml`, `service.yaml` |

Copy the shape of `k8s/vehicles/` for your own services. It's the simplest one.

## Names everyone relies on

Change any of these only after telling the whole team, because other people's YAML points at them.

**Kubernetes Service names and ports** (each service's `service.yaml`, all `ClusterIP`):

| Service name | Port |
| --- | --- |
| `api-gateway` | 3000 |
| `registration` | 3001 |
| `login` | 3002 |
| `booking` | 3003 |
| `vehicles` | 3004 |
| `work-orders` | 3005 |
| `repair-notes` | 3006 |
| `billing` | 3007 |
| `service-catalog` | 3008 |
| `log-viewer` | 80 |

The Service name is also the DNS name inside the cluster, so the gateway reaches Vehicles at `http://vehicles:3004`.

**ConfigMap `shop-config`** (keys):

```
REGISTRATION_URL      http://registration:3001
LOGIN_URL             http://login:3002
BOOKING_URL           http://booking:3003
VEHICLES_URL          http://vehicles:3004
WORK_ORDERS_URL       http://work-orders:3005
NOTES_URL             http://repair-notes:3006
BILLING_URL           http://billing:3007
CATALOG_URL           http://service-catalog:3008
GATEWAY_INTERNAL_URL  http://api-gateway:3000
```

**Secret `shop-secrets`** (keys). One Atlas URI per database, each ending in its database name:

```
JWT_SECRET            used by api-gateway and login
MONGO_URI_AUTH        .../auth_db?...        registration, login
MONGO_URI_BOOKINGS    .../bookings_db?...    booking
MONGO_URI_VEHICLES    .../vehicles_db?...    vehicles
MONGO_URI_WORKORDERS  .../workorders_db?...  work-orders
MONGO_URI_NOTES       .../notes_db?...       repair-notes
MONGO_URI_BILLING     .../billing_db?...     billing
MONGO_URI_CATALOG     .../catalog_db?...     service-catalog
```

Only `secret.example.yaml` (placeholders) goes in git. The real `secret.yaml` is gitignored.

**PersistentVolumeClaim `shared-logs`**: mounted at `/logs` in the gateway (writes `gateway.log`) and read by the log viewer.

**Images**: `shop-<service>:v2`, built inside Minikube with `imagePullPolicy: Never` (see below).

## Conventions for every Deployment

- `INSTANCE_NAME` comes from the pod name (downward API), so responses show which pod answered.
- `readinessProbe` and `livenessProbe` on `GET /health`.
- Small `resources` requests and a memory limit, so one service can't starve the others.
- Labels: `app: <service-name>`. The Service's `selector` uses the same label.

## Running it

The commands below are for macOS / Linux. The demo ran on Windows; the PowerShell version is in the main [README](../README.md#deploy-on-kubernetes).

```bash
minikube start
minikube addons enable ingress

# Build all images straight into Minikube's Docker (no Docker Hub needed)
eval $(minikube docker-env)
for s in api-gateway registration login booking vehicles work-orders repair-notes billing service-catalog; do
  docker build -t shop-$s:v2 services/$s
done

# Config and storage first, then the services, then the Ingress
kubectl apply -f k8s/config/configmap.yaml -f k8s/config/secret.yaml
kubectl apply -f k8s/storage/pvc.yaml
kubectl apply -f k8s/storage/permissions-job.yaml
kubectl wait --for=condition=complete job/fix-log-permissions --timeout=120s
kubectl apply -R -f k8s/api-gateway -f k8s/registration -f k8s/login -f k8s/booking -f k8s/vehicles \
  -f k8s/work-orders -f k8s/repair-notes -f k8s/billing -f k8s/service-catalog -f k8s/log-viewer
kubectl apply -f k8s/ingress

kubectl get pods        # wait until everything is Running and 1/1 READY
```

The Ingress needs the domain to point at the cluster. On a Mac (Docker driver):

```bash
echo "127.0.0.1 carrepair.com" | sudo tee -a /etc/hosts
minikube tunnel          # leave this running in its own terminal
```

Then Postman uses `http://carrepair.com/api/...`, and the gateway log is at `http://carrepair.com/logs/`.
