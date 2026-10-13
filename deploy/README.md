# Deploying to the 3 EC2 instances

| Instance | Folder | Containers |
|---|---|---|
| EC2-1 | `deploy/ec2-1` | api-gateway (3000), registration (3001), login (3002) |
| EC2-2 | `deploy/ec2-2` | booking (3003), vehicles (3004), work-orders (3005), service-catalog replica A (3008) |
| EC2-3 | `deploy/ec2-3` | repair-notes (3006), billing (3007), service-catalog replica B (3008) |

The three instances must be in the same VPC so they can reach each other on **private IPs**.
Only the gateway (EC2-1, port 3000) is open to the internet; see the security groups in the PRD.

## One-time setup on each instance

```bash
ssh -i labsuser.pem ubuntu@<PUBLIC IP>

# Install Docker Engine + the compose plugin
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit        # log out, then ssh back in so the group change applies

# Get the code
git clone <repo url> car-repair-microservices
cd car-repair-microservices/deploy/ec2-N        # N = 1, 2 or 3

# Create the real env files from the templates, then fill them in
mkdir env
cp env.example/*.env env/
nano env/api-gateway.env                          # replace every PLACEHOLDER; repeat for each file
```

Replace `<EC2-N private IP>`, `USER`, `PASSWORD`, `CLUSTER_HOST` and `PASTE_THE_..._SECRET`.
Private IPs are shown in the EC2 console (not the public ones). `env/` is gitignored, so secrets are never committed.

## Start, check, update

```bash
docker compose up -d --build     # build the images on this server and start the containers
docker compose ps                # every container should say "healthy" after about 30 seconds
docker compose logs -f login     # follow one service's logs (Ctrl+C to stop following)

# After teammates merge new code to main:
git pull && docker compose up -d --build

docker compose down              # stop everything on this instance
```

Start order does not matter. Do EC2-2 and EC2-3 before testing through the gateway.

## Load balancer demo (screenshots)

```
GET http://<EC2-1 PUBLIC IP>:3000/api/catalog/health     (send it 4 times)
```

The `instance` field should alternate `catalog-a`, `catalog-b`, `catalog-a`, `catalog-b`.
This works because the gateway's `CATALOG_URLS` lists both replicas.

## After a Learner Lab restart

Private IPs stay the same, so no env file changes. The **public** IPs change: update the gateway
address in the Postman environment with EC2-1's new public IP. Check `docker compose ps` on each instance
(containers have `restart: unless-stopped`, so they should come back by themselves).
