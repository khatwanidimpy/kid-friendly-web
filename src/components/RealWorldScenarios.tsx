import { useCallback, useEffect, useState } from "react";
import { scenarios, type Scenario, type Difficulty } from "@/data/scenarios";

const STORAGE_KEY = "devkit:scenarios:solved:v1";

function loadSolved(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

function saveSolved(set: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore quota errors */
  }
}

function useSolved() {
  const [solved, setSolved] = useState<Set<string>>(() => new Set());

  // Hydrate after mount to avoid SSR mismatch.
  useEffect(() => {
    setSolved(loadSolved());
  }, []);

  const toggle = useCallback((id: string) => {
    setSolved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveSolved(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSolved(() => {
      const empty = new Set<string>();
      saveSolved(empty);
      return empty;
    });
  }, []);

  return { solved, toggle, reset };
}


type Difficulty = "Mid" | "Senior" | "Staff";

type Scenario = {
  id: string;
  category: "Docker" | "Kubernetes" | "Linux";
  difficulty: Difficulty;
  title: string;
  scene: string;
  question: string;
  hint: string;
  answer: string;
  commands?: string[];
  takeaway: string;
};

const scenarios: Scenario[] = [
  // ───── Docker ─────
  {
    id: "d1",
    category: "Docker",
    difficulty: "Senior",
    title: "The container that won't die",
    scene:
      "Production: a container keeps restarting every ~30 seconds. `docker logs` shows the app started fine, then the container exits with code 137. CPU and memory look normal in your monitoring dashboard.",
    question:
      "What is most likely killing the container, and how do you confirm it?",
    hint: "Exit code 137 = 128 + 9 (SIGKILL). Who sends SIGKILL silently?",
    answer:
      "The kernel OOM-killer is killing the process because the container hit its memory limit. Your dashboard averages over 1 min, so short memory spikes don't show up. Check `docker inspect` for OOMKilled: true, and look at the host's `dmesg` for 'Out of memory' lines naming the cgroup.",
    commands: [
      "docker inspect <container> | grep -i oomkilled",
      "dmesg -T | grep -i 'killed process'",
      "docker stats --no-stream <container>",
    ],
    takeaway:
      "Exit 137 + auto-restart almost always = OOMKill. Raise the memory limit or fix the leak — never just bump restarts.",
  },
  {
    id: "d2",
    category: "Docker",
    difficulty: "Senior",
    title: "Image works on my laptop, breaks in CI",
    scene:
      "Your Dockerfile builds and runs perfectly on your M2 Mac. In the CI pipeline (Linux x86_64), the same image fails at runtime with `exec format error`.",
    question: "What's wrong, and what's the fix that scales to a team?",
    hint: "What CPU architecture is your Mac vs the CI runner?",
    answer:
      "You built an arm64 image locally and pushed it. The x86_64 CI runner can't execute arm64 binaries. Fix it by building multi-arch images with Buildx and pushing a manifest list so each platform pulls the right layer.",
    commands: [
      "docker buildx create --use --name multi",
      "docker buildx build --platform linux/amd64,linux/arm64 -t myorg/app:1.2 --push .",
    ],
    takeaway:
      "Never assume single-arch in 2025. Bake multi-arch builds into CI so 'works on my laptop' stops being a sentence.",
  },
  {
    id: "d3",
    category: "Docker",
    difficulty: "Staff",
    title: "Disk filling up on every node",
    scene:
      "Every few days, your Docker hosts hit 100% disk and crash. You have log rotation enabled. `du -sh /var/lib/docker/*` shows `overlay2` taking 80GB.",
    question: "Where is the space actually going, and how do you stop it?",
    hint: "Stopped containers, dangling images, build cache, anonymous volumes…",
    answer:
      "It's almost always a mix of: dangling images from CI builds, anonymous volumes from `docker run` without --rm, and BuildKit cache. Run a targeted prune (not a blind one — that nukes named volumes you might need). Then add a daily cron and set log driver max-size in daemon.json.",
    commands: [
      "docker system df -v",
      "docker image prune -a --filter 'until=168h'",
      "docker builder prune --filter 'until=72h'",
      "docker volume ls -qf dangling=true | xargs -r docker volume rm",
    ],
    takeaway:
      "Hosts don't fill 'suddenly' — they fill predictably. Schedule prunes and cap log size in /etc/docker/daemon.json.",
  },

  // ───── Kubernetes ─────
  {
    id: "k1",
    category: "Kubernetes",
    difficulty: "Senior",
    title: "Pod stuck in CrashLoopBackOff",
    scene:
      "A new deployment goes out. One pod is in CrashLoopBackOff. `kubectl logs` shows nothing — the container exits before logging. `kubectl describe pod` shows 'Back-off restarting failed container'.",
    question:
      "How do you debug a container that dies before producing any logs?",
    hint: "Logs from THIS run are empty — what about the previous run?",
    answer:
      "Use `kubectl logs --previous` to see the last failed run's stdout. If still empty, the process is crashing pre-stdout (missing binary, bad command, failed liveness probe). Use `kubectl debug` to attach an ephemeral container with shell tools to the same pod's namespaces and inspect filesystem, env, and DNS.",
    commands: [
      "kubectl logs <pod> --previous",
      "kubectl describe pod <pod> | grep -A5 -i 'last state'",
      "kubectl debug -it <pod> --image=busybox --target=<container>",
    ],
    takeaway:
      "`--previous` and `kubectl debug` are the two commands that separate juniors from seniors when pods crash silently.",
  },
  {
    id: "k2",
    category: "Kubernetes",
    difficulty: "Staff",
    title: "Cluster autoscaler won't scale up",
    scene:
      "Pods are stuck in Pending. You see 'Insufficient cpu' in events. Cluster Autoscaler logs say `pod didn't trigger scale-up: 1 node(s) didn't match Pod's node affinity`.",
    question: "Why won't a new node fix this, and what do you check first?",
    hint: "Autoscaler simulates: 'If I added a node from this group, would the pod fit?'",
    answer:
      "Your pod has a nodeAffinity / nodeSelector / taint-toleration combo that no available node group can satisfy. The autoscaler refuses to add a node it knows won't host the pod. Check the pod's affinity, then check that at least one node group's labels and taints match. Also verify the group's max size hasn't been reached.",
    commands: [
      "kubectl get pod <pod> -o yaml | grep -A20 affinity",
      "kubectl get nodes --show-labels",
      "kubectl -n kube-system logs deploy/cluster-autoscaler | grep -i 'didn.t trigger'",
    ],
    takeaway:
      "Autoscaler is honest: if it says 'didn't trigger', the math doesn't work. Fix the pod spec or add a matching node group.",
  },
  {
    id: "k3",
    category: "Kubernetes",
    difficulty: "Senior",
    title: "Service works, then doesn't, then works",
    scene:
      "Users intermittently get 502 errors from a Service backed by 4 pods. Health checks pass. `kubectl get endpoints` shows all 4 IPs. Latency dashboards look fine.",
    question:
      "Why does a healthy-looking Service still drop ~25% of requests?",
    hint: "What happens in the moment between a pod terminating and being removed from the Endpoints list?",
    answer:
      "One pod is being killed (rolling deploy, eviction, or crash) and is still in the Endpoints list for a few hundred ms while it's no longer accepting connections. kube-proxy hasn't reprogrammed iptables yet. Fix: add a `preStop` hook that sleeps 5–10s, set `terminationGracePeriodSeconds`, and ensure your app handles SIGTERM by draining connections.",
    commands: [
      "kubectl get endpoints <svc> -w",
      "kubectl get events --sort-by=.lastTimestamp | grep -i kill",
      "kubectl describe pod <pod> | grep -A3 -i lifecycle",
    ],
    takeaway:
      "Graceful shutdown isn't optional in K8s. preStop sleep + SIGTERM handling = no more random 502s during deploys.",
  },

  // ───── Linux ─────
  {
    id: "l1",
    category: "Linux",
    difficulty: "Senior",
    title: "Disk says full, but `du` disagrees",
    scene:
      "`df -h` shows /var at 100% full. You run `du -sh /var/*` and the totals add up to barely 30% of the disk. Deleting files in /var/log frees nothing.",
    question: "Where are the missing gigabytes hiding?",
    hint: "A deleted file isn't really deleted while a process still has it open.",
    answer:
      "A process (often a logger or app writing to a rotated log) still has a file descriptor open on a 'deleted' file. The inode and its blocks stay allocated until the FD closes. Find the process with `lsof | grep deleted` and either restart it or truncate the FD via /proc.",
    commands: [
      "lsof +L1",
      "lsof | grep deleted | sort -k7 -nr | head",
      ": > /proc/<pid>/fd/<n>   # truncate without restart",
    ],
    takeaway:
      "df measures the filesystem; du measures filenames. Deleted-but-open files are the classic gap between them.",
  },
  {
    id: "l2",
    category: "Linux",
    difficulty: "Staff",
    title: "Load average is 40, but CPU is idle",
    scene:
      "uptime shows load average of 40 on an 8-core box. `top` shows %CPU mostly idle. The server feels sluggish — every command takes seconds.",
    question: "What does load average actually count, and what's the culprit?",
    hint: "Load average includes processes in state R AND state D.",
    answer:
      "Linux load includes uninterruptible sleep (D state) — typically processes blocked on I/O or NFS. CPU is idle because everyone is waiting on disk/network. Find D-state processes, check iostat for high `%util` or `await`, and look for a slow disk, dying NVMe, or hung NFS mount.",
    commands: [
      "ps -eo pid,state,comm | awk '$2 ~ /D/'",
      "iostat -xz 1 5",
      "dmesg -T | grep -i -E 'i/o error|nfs|timeout'",
    ],
    takeaway:
      "High load + idle CPU = I/O bottleneck. Investigate disks and network mounts before blaming the app.",
  },
  {
    id: "l3",
    category: "Linux",
    difficulty: "Senior",
    title: "SSH hangs, but ping works",
    scene:
      "You can ping the server, TCP handshakes complete, but `ssh user@host` hangs at 'debug1: Connecting…' for 30 seconds before logging in.",
    question:
      "What's the classic cause of slow SSH on an otherwise healthy network?",
    hint: "What does sshd try to do with your IP before it lets you in?",
    answer:
      "sshd is doing a reverse DNS lookup on your client IP and the server's resolver is timing out. Set `UseDNS no` in /etc/ssh/sshd_config (or fix DNS). A second offender is GSSAPIAuthentication — disable it on the client with `-o GSSAPIAuthentication=no` to confirm.",
    commands: [
      "ssh -vvv user@host  # find which step hangs",
      "sudo sed -i 's/^#UseDNS.*/UseDNS no/' /etc/ssh/sshd_config",
      "sudo systemctl reload sshd",
    ],
    takeaway:
      "When SSH is slow but TCP is fine, it's almost always DNS or GSSAPI. `ssh -vvv` tells you exactly which line hangs.",
  },

  // ───── Docker (extended) ─────
  {
    id: "d4",
    category: "Docker",
    difficulty: "Mid",
    title: "Container can't reach the internet",
    scene:
      "A freshly started container can't `curl https://google.com`, but the host can. `docker network ls` looks normal.",
    question: "What are the first three things you check?",
    hint: "DNS, iptables, and the default bridge.",
    answer:
      "Check (1) container DNS — `/etc/resolv.conf` inside the container; (2) host iptables/FORWARD chain — Docker needs it set to ACCEPT or its own rules; (3) `net.ipv4.ip_forward=1` on the host. A recent firewalld or UFW rule often resets FORWARD to DROP.",
    commands: [
      "docker run --rm alpine cat /etc/resolv.conf",
      "sudo iptables -L FORWARD -n",
      "sysctl net.ipv4.ip_forward",
    ],
    takeaway:
      "Docker networking depends on the host's forwarding + iptables. Firewall reloads are the usual culprit.",
  },
  {
    id: "d5",
    category: "Docker",
    difficulty: "Senior",
    title: "Build cache never hits in CI",
    scene:
      "Local builds are fast (10s) thanks to layer cache. In CI every build is 8 minutes — every layer rebuilds from scratch.",
    question: "Why is the cache cold, and how do you warm it?",
    hint: "CI runners are ephemeral. Where does cache live?",
    answer:
      "Each CI job gets a fresh runner with no local layer cache. Use BuildKit's `--cache-from` / `--cache-to` to push cache to a registry (or `type=gha` on GitHub Actions). Also order Dockerfile steps from least-to-most changing (deps before source).",
    commands: [
      "docker buildx build --cache-to type=registry,ref=myorg/app:cache,mode=max --cache-from type=registry,ref=myorg/app:cache -t myorg/app:ci --push .",
      "# GHA: cache-to=type=gha,mode=max  cache-from=type=gha",
    ],
    takeaway:
      "CI cache must be externalized. Registry or GHA cache + good layer ordering = 10x faster pipelines.",
  },
  {
    id: "d6",
    category: "Docker",
    difficulty: "Mid",
    title: "Permission denied on mounted volume",
    scene:
      "You mount `-v $(pwd)/data:/app/data` and the container logs `EACCES: permission denied, open '/app/data/file'`. The directory exists.",
    question: "Why can't the container write, and what's the proper fix?",
    hint: "UID inside container vs UID on host.",
    answer:
      "The container runs as a different UID (often non-root like 1000 or a service user) than the host directory's owner. Fix by either matching UIDs (`--user $(id -u):$(id -g)`), `chown`-ing the host dir to the container's UID, or building the image with a known UID and chowning during build.",
    commands: [
      "docker run --user $(id -u):$(id -g) -v $(pwd)/data:/app/data myimg",
      "ls -ln data/   # see numeric owner",
    ],
    takeaway:
      "Volume permission errors are always a UID mismatch. Fix the UID, don't `chmod 777`.",
  },
  {
    id: "d7",
    category: "Docker",
    difficulty: "Senior",
    title: "Image is 2GB — should be 200MB",
    scene:
      "Your Node.js production image weighs in at 2.1GB. Pulls are slow, registry costs are climbing.",
    question: "Where is the bloat and how do you cut it 10x?",
    hint: "Build deps, dev deps, and what base image you're FROM.",
    answer:
      "Three big wins: (1) multi-stage build — compile in `node:20`, copy artifacts into `node:20-alpine` or `gcr.io/distroless/nodejs`; (2) `.dockerignore` to exclude `node_modules`, `.git`, tests; (3) `npm ci --omit=dev` in the final stage. Use `dive` to audit layer-by-layer.",
    commands: [
      "dive myimg:latest",
      "docker history myimg:latest --no-trunc",
      "# FROM node:20 AS build ... FROM node:20-alpine AS runtime",
    ],
    takeaway:
      "Multi-stage + slim base + .dockerignore turns 2GB into 150MB without changing your app.",
  },
  {
    id: "d8",
    category: "Docker",
    difficulty: "Staff",
    title: "Secrets leaked in image layers",
    scene:
      "A security audit finds your AWS keys in a published image, even though you `rm`-ed the file in a later RUN step.",
    question: "Why are deleted secrets still in the image?",
    hint: "Each RUN creates a new layer. Layers are immutable.",
    answer:
      "`rm` in a later layer only hides the file in the final filesystem — earlier layers still contain it and anyone with the image can `docker history` or extract them. Use BuildKit secrets (`--mount=type=secret`), build args that aren't persisted, or never put secrets in build context.",
    commands: [
      "DOCKER_BUILDKIT=1 docker build --secret id=aws,src=$HOME/.aws/credentials .",
      "# In Dockerfile: RUN --mount=type=secret,id=aws cat /run/secrets/aws",
      "docker history --no-trunc myimg | grep -i secret",
    ],
    takeaway:
      "Layers are forever. Use BuildKit secret mounts — never COPY then rm a credential.",
  },
  {
    id: "d9",
    category: "Docker",
    difficulty: "Senior",
    title: "Compose works, swarm/k8s doesn't",
    scene:
      "Your `docker compose up` works flawlessly. The same image in Kubernetes can't reach its database service by name.",
    question: "Why does service discovery break across orchestrators?",
    hint: "Compose creates a project network with service-name DNS. K8s uses…?",
    answer:
      "Compose auto-creates a bridge network where each service is reachable by its compose service name. K8s uses Service objects and CoreDNS — you must create a Service for the database and reference it by service name (or `service.namespace.svc.cluster.local`). The hostname in your app config also needs to match the K8s Service name.",
    commands: [
      "kubectl get svc",
      "kubectl run -it --rm dnsdebug --image=busybox --restart=Never -- nslookup mydb",
    ],
    takeaway:
      "Compose ≠ K8s networking. Always check that a Service exists and your app uses the right hostname.",
  },
  {
    id: "d10",
    category: "Docker",
    difficulty: "Senior",
    title: "Healthcheck reports healthy but app is down",
    scene:
      "Your container's HEALTHCHECK is passing (`docker ps` shows healthy), but users report 500s. Inside the container, the app is hung.",
    question: "What's wrong with the healthcheck?",
    hint: "What is the healthcheck actually testing?",
    answer:
      "The healthcheck likely hits `/` or a TCP port that the framework keeps open even when downstream (DB, queue) is broken. Move to a real `/healthz` endpoint that exercises critical dependencies and returns non-200 when they fail. Set `--start-period`, `--interval`, and `--retries` sensibly.",
    commands: [
      "docker inspect --format='{{json .State.Health}}' <container> | jq",
      "# HEALTHCHECK CMD curl -fsS http://localhost:8080/healthz || exit 1",
    ],
    takeaway:
      "A healthcheck that always passes is worse than no healthcheck — it hides outages from your orchestrator.",
  },

  // ───── Kubernetes (extended) ─────
  {
    id: "k4",
    category: "Kubernetes",
    difficulty: "Mid",
    title: "ImagePullBackOff after a deploy",
    scene:
      "You push a new image and rollout fails with `ImagePullBackOff`. The image tag exists in the registry — you just pushed it.",
    question: "What are the three most common causes?",
    hint: "Auth, typos, and private registries.",
    answer:
      "(1) Wrong tag/typo in the manifest; (2) private registry with no `imagePullSecrets` configured on the pod or default service account; (3) registry rate-limit (Docker Hub anonymous pulls). `kubectl describe pod` will tell you which — read the Events.",
    commands: [
      "kubectl describe pod <pod> | tail -20",
      "kubectl create secret docker-registry regcred --docker-server=... --docker-username=... --docker-password=...",
      "kubectl patch sa default -p '{\"imagePullSecrets\":[{\"name\":\"regcred\"}]}'",
    ],
    takeaway:
      "`kubectl describe pod` always names the real cause. Don't guess — read the Events block.",
  },
  {
    id: "k5",
    category: "Kubernetes",
    difficulty: "Senior",
    title: "OOMKilled after node upgrade",
    scene:
      "After upgrading nodes from 1.27 to 1.29, several pods start getting OOMKilled. Their memory limits and actual usage haven't changed.",
    question: "What changed at the node level that's now killing your pods?",
    hint: "cgroup v1 vs cgroup v2.",
    answer:
      "Newer node images default to cgroup v2, which accounts memory differently (kernel memory, page cache attribution). Apps that lived just under their limit on v1 now exceed it on v2. Either bump the limit, or fix the actual leak — `kubectl top pod` and a heap profile will show which.",
    commands: [
      "kubectl describe node | grep -i cgroup",
      "kubectl top pod --containers",
      "kubectl get events --field-selector reason=OOMKilling",
    ],
    takeaway:
      "Cgroup v2 is stricter. Pods near their limit will tip over after node upgrades — right-size before upgrading.",
  },
  {
    id: "k6",
    category: "Kubernetes",
    difficulty: "Staff",
    title: "PVC stuck in Pending forever",
    scene:
      "A new StatefulSet pod is Pending. Its PVC is also Pending: `waiting for a volume to be created, either by external provisioner ...`.",
    question: "What's the matchmaking failure between PVC and PV?",
    hint: "StorageClass, zone, and binding mode.",
    answer:
      "Three usual causes: (1) no StorageClass with a matching provisioner installed; (2) `volumeBindingMode: WaitForFirstConsumer` plus a pod scheduled to a zone where the storage backend can't provision; (3) quotas hit on the cloud volume API. Check the storage controller logs in `kube-system` (or wherever the CSI driver lives).",
    commands: [
      "kubectl get sc",
      "kubectl describe pvc <pvc>",
      "kubectl -n kube-system logs -l app=ebs-csi-controller -c csi-provisioner --tail=100",
    ],
    takeaway:
      "PVC Pending is always a provisioner conversation. The CSI controller logs tell you exactly why.",
  },
  {
    id: "k7",
    category: "Kubernetes",
    difficulty: "Senior",
    title: "Ingress returns 502 after TLS renew",
    scene:
      "cert-manager renewed your TLS cert. Suddenly the Ingress returns 502 Bad Gateway for that host. Other hosts on the same controller are fine.",
    question: "What did the renewal break?",
    hint: "Did the controller actually pick up the new Secret?",
    answer:
      "Some ingress controllers (older NGINX, HAProxy) cache TLS certs in memory and don't auto-reload when the Secret changes. The renewed cert lives in the Secret but the controller is still presenting the old one — until reconfig fails closed and returns 502. Restart/reload the controller, or upgrade to a version with proper Secret-watch.",
    commands: [
      "kubectl -n ingress-nginx logs -l app.kubernetes.io/name=ingress-nginx --tail=200",
      "kubectl -n ingress-nginx rollout restart deploy/ingress-nginx-controller",
      "kubectl get secret <tls-secret> -o yaml | grep tls.crt | head",
    ],
    takeaway:
      "Cert renewal isn't done until the controller actually reloads. Use a controller that watches Secrets, or restart it.",
  },
  {
    id: "k8",
    category: "Kubernetes",
    difficulty: "Senior",
    title: "HPA never scales up under load",
    scene:
      "Load test pushes CPU to 95%, but your HorizontalPodAutoscaler stays at 1 replica. `kubectl get hpa` shows `<unknown>/70%`.",
    question: "Why is the HPA blind, and how do you fix it?",
    hint: "What does the HPA query for metrics?",
    answer:
      "`<unknown>` means the HPA can't read metrics. Either metrics-server isn't installed/healthy, or the pod has no `resources.requests.cpu` set (HPA needs requests to compute %). Install metrics-server and ensure every pod controlled by HPA has CPU/memory requests defined.",
    commands: [
      "kubectl top pod   # fails if metrics-server is missing",
      "kubectl -n kube-system get deploy metrics-server",
      "kubectl describe hpa <hpa>",
    ],
    takeaway:
      "HPA needs metrics-server AND resource requests. Without both, autoscaling silently does nothing.",
  },
  {
    id: "k9",
    category: "Kubernetes",
    difficulty: "Staff",
    title: "Mystery pod-to-pod latency spike",
    scene:
      "App-to-app calls inside the cluster suddenly P99 jumps from 5ms to 400ms. Node CPU/mem normal. No deploys went out. DNS lookups feel slow.",
    question: "What's the most common cluster-wide latency culprit?",
    hint: "Every connection starts with a name resolution.",
    answer:
      "CoreDNS is overloaded or the `ndots:5` default is causing 5+ NXDOMAIN lookups per external call. Check CoreDNS pod CPU and error rate, scale it up, enable NodeLocal DNSCache, and consider `dnsConfig.options: ndots: 1` for pods making external calls.",
    commands: [
      "kubectl -n kube-system top pod -l k8s-app=kube-dns",
      "kubectl -n kube-system logs -l k8s-app=kube-dns --tail=200 | grep -i error",
      "kubectl run -it --rm dnstest --image=busybox --restart=Never -- time nslookup api.github.com",
    ],
    takeaway:
      "When the whole cluster slows down at once, suspect CoreDNS first. NodeLocal DNSCache is cheap insurance.",
  },
  {
    id: "k10",
    category: "Kubernetes",
    difficulty: "Senior",
    title: "ConfigMap update doesn't reach the pod",
    scene:
      "You edit a ConfigMap mounted as a volume. The file inside the running pod still shows the old value 10 minutes later.",
    question: "Why doesn't the pod see the change, and when will it?",
    hint: "kubelet sync interval vs subPath mounts.",
    answer:
      "ConfigMaps mounted as volumes update eventually (kubelet sync ~60–120s) — UNLESS you used `subPath`, which freezes the file at pod start. For env vars from ConfigMaps, the pod must restart. Best practice: don't use subPath for configs you want hot-reloaded, and have the app watch the file or use a sidecar reloader.",
    commands: [
      "kubectl exec <pod> -- cat /etc/config/myfile",
      "kubectl get pod <pod> -o yaml | grep -A3 subPath",
      "kubectl rollout restart deploy/<deploy>   # force pickup",
    ],
    takeaway:
      "subPath = no live updates. Env vars from ConfigMaps = no live updates. Plan your reload story.",
  },
  {
    id: "k11",
    category: "Kubernetes",
    difficulty: "Staff",
    title: "etcd is slow — whole cluster lags",
    scene:
      "kubectl commands take 5–10 seconds. `kubectl get events` shows `etcdserver: request timed out`. Workloads still run but admin is painful.",
    question: "What's choking etcd, and what do you do live?",
    hint: "Disk I/O is etcd's #1 enemy.",
    answer:
      "etcd needs fast fsync — if the disk's write latency exceeds ~10ms, etcd starts timing out. Either the disk is degraded, the node is noisy-neighbored, or etcd has grown huge (>2GB) and needs defrag. Move etcd to NVMe, defrag, and set up alerts on `etcd_disk_wal_fsync_duration_seconds`.",
    commands: [
      "ETCDCTL_API=3 etcdctl --endpoints=... endpoint status -w table",
      "ETCDCTL_API=3 etcdctl --endpoints=... defrag",
      "# metric: etcd_disk_wal_fsync_duration_seconds_bucket",
    ],
    takeaway:
      "etcd lives or dies by disk fsync latency. Put it on the fastest disk you have and defrag periodically.",
  },

  // ───── Linux (extended) ─────
  {
    id: "l4",
    category: "Linux",
    difficulty: "Mid",
    title: "Service won't start after edit",
    scene:
      "You edited `/etc/nginx/nginx.conf` and ran `systemctl restart nginx`. It fails. `systemctl status nginx` just says `failed`.",
    question: "Where do you actually find the real error?",
    hint: "systemctl status is a summary. The real log is elsewhere.",
    answer:
      "`systemctl status` truncates. Use `journalctl -u nginx -n 50 --no-pager` for the full systemd log, and `nginx -t` to validate config before restart. 90% of the time it's a missing semicolon or a referenced file that doesn't exist.",
    commands: [
      "sudo nginx -t",
      "sudo journalctl -u nginx -n 100 --no-pager",
      "sudo systemctl restart nginx",
    ],
    takeaway:
      "Always validate config before reload. `journalctl -u <svc>` shows what `status` hides.",
  },
  {
    id: "l5",
    category: "Linux",
    difficulty: "Senior",
    title: "Out of inodes, but disk has space",
    scene:
      "Writes fail with `No space left on device` but `df -h` shows the partition only 40% full.",
    question: "What's actually exhausted?",
    hint: "Files take both blocks AND inodes.",
    answer:
      "You're out of inodes — too many tiny files (mail spool, session files, cache directories with millions of entries). `df -i` confirms. Find the directory with the most files and prune it; long-term, mount with a filesystem that allocates inodes dynamically (XFS, btrfs) or reformat with more inodes.",
    commands: [
      "df -i",
      "sudo find / -xdev -type f | cut -d/ -f2 | sort | uniq -c | sort -rn | head",
      "ls /var/cache/foo | wc -l",
    ],
    takeaway:
      "`df -h` is only half the story. Always check `df -i` when writes mysteriously fail.",
  },
  {
    id: "l6",
    category: "Linux",
    difficulty: "Senior",
    title: "Cron job runs manually, fails on schedule",
    scene:
      "Your backup script runs perfectly when you execute it. The same script in cron silently does nothing — no error, no output.",
    question: "Why does cron's environment break scripts?",
    hint: "cron has almost no environment.",
    answer:
      "cron runs with a minimal PATH and no shell rc files — so commands like `aws`, `kubectl`, or relative paths fail. Add absolute paths, set `PATH=` at the top of the crontab, and redirect stderr to a log: `* * * * * /path/script.sh >> /var/log/job.log 2>&1`. Then you'll actually see the error.",
    commands: [
      "crontab -l",
      "* * * * * /usr/local/bin/aws s3 sync ... >> /var/log/backup.log 2>&1",
      "env -i /bin/sh -c 'which aws'   # simulate cron env",
    ],
    takeaway:
      "Cron silence is not success. Always log stderr and use absolute paths.",
  },
  {
    id: "l7",
    category: "Linux",
    difficulty: "Staff",
    title: "TIME_WAIT sockets eating the port range",
    scene:
      "A high-throughput service starts failing with `cannot assign requested address`. `ss -s` shows 28,000 sockets in TIME_WAIT.",
    question: "What's exhausted, and what's the right fix?",
    hint: "Local ephemeral ports.",
    answer:
      "The client side is running out of ephemeral ports because every short-lived outgoing connection lingers in TIME_WAIT for 60s. Fixes (in order): (1) use connection pooling / keep-alive in the app — best fix; (2) widen `net.ipv4.ip_local_port_range`; (3) enable `net.ipv4.tcp_tw_reuse=1`. Do NOT enable `tcp_tw_recycle` — it was removed for good reason.",
    commands: [
      "ss -s",
      "sysctl net.ipv4.ip_local_port_range",
      "sudo sysctl -w net.ipv4.tcp_tw_reuse=1",
    ],
    takeaway:
      "Fix the app first (pooling). Kernel knobs are bandaids. Never tcp_tw_recycle.",
  },
  {
    id: "l8",
    category: "Linux",
    difficulty: "Mid",
    title: "Process won't die, even with kill -9",
    scene:
      "`kill -9 <pid>` returns success but the process keeps showing in `ps`. State column shows `D`.",
    question: "Why is even SIGKILL ignored?",
    hint: "What does state D mean?",
    answer:
      "State D is uninterruptible sleep — the process is waiting on a kernel I/O call (usually a hung NFS mount or a dying disk). The kernel won't deliver signals until the syscall returns. You can't kill it without fixing the underlying I/O (unmount with `-f -l`, reboot the storage, or in the worst case, reboot the host).",
    commands: [
      "ps -eo pid,stat,wchan,comm | awk '$2 ~ /D/'",
      "cat /proc/<pid>/stack",
      "sudo umount -f -l /mnt/badnfs",
    ],
    takeaway:
      "kill -9 cannot reach a D-state process. Find the hung I/O and free it instead.",
  },
  {
    id: "l9",
    category: "Linux",
    difficulty: "Senior",
    title: "Server clock drift breaking auth",
    scene:
      "Some API calls intermittently fail with `token used before issued` or `signature expired`. Auth team confirms tokens are valid.",
    question: "What's the silent culprit?",
    hint: "JWT validation is time-sensitive to the second.",
    answer:
      "The server's clock has drifted (often after a VM live-migration, a hypervisor restart, or chronyd not running). JWT/OAuth validation has tight skew tolerance. Verify with `chronyc tracking` or `timedatectl` and ensure NTP is healthy on every node.",
    commands: [
      "timedatectl",
      "chronyc tracking",
      "sudo systemctl status chronyd",
    ],
    takeaway:
      "Time sync is infrastructure. One drifted node = mysterious auth failures only on that node.",
  },
  {
    id: "l10",
    category: "Linux",
    difficulty: "Senior",
    title: "Memory 'used' high but app is small",
    scene:
      "`free -h` shows 28GB used out of 32GB. Your app uses 4GB. The host doesn't run anything else big.",
    question: "Is the box actually low on memory?",
    hint: "`free` lumps cache into used in some views.",
    answer:
      "Most of that is page cache — Linux uses free RAM to cache disk blocks and will release it under pressure. Look at the `available` column, not `used`. Real pressure shows up as swap-in/out activity (`vmstat 1`) and `MemAvailable` in `/proc/meminfo` dropping low.",
    commands: [
      "free -h",
      "cat /proc/meminfo | grep -E 'MemAvailable|Cached|Buffers'",
      "vmstat 1 5",
    ],
    takeaway:
      "Cache is not used. Trust `available` and watch swap activity to know real memory pressure.",
  },
  {
    id: "l11",
    category: "Linux",
    difficulty: "Staff",
    title: "fork: Resource temporarily unavailable",
    scene:
      "A long-running service starts failing with `fork: Resource temporarily unavailable`. The host has plenty of CPU/RAM.",
    question: "What limit is being hit?",
    hint: "It's a per-user kernel limit, not a memory one.",
    answer:
      "You've hit `kernel.pid_max` system-wide, or much more commonly the per-user thread limit (`ulimit -u` / `nproc`). A leaking app spawning threads without joining will blow this. Check `ps -eLf | wc -l` and the user's process count, raise the limit in `/etc/security/limits.d/`, but really — find the leak.",
    commands: [
      "ulimit -u",
      "ps -eLf | awk '{print $1}' | sort | uniq -c | sort -rn | head",
      "cat /proc/sys/kernel/pid_max",
    ],
    takeaway:
      "fork failures = thread/PID exhaustion, not memory. Raise limits to buy time, then fix the leak.",
  },
];

const categories = ["All", "Docker", "Kubernetes", "Linux"] as const;
type Category = (typeof categories)[number];

const catColor: Record<Scenario["category"], string> = {
  Docker: "bg-brick-blue text-white",
  Kubernetes: "bg-brick-green text-white",
  Linux: "bg-brick-yellow text-[color:var(--case-border)]",
};

const diffColor: Record<Difficulty, string> = {
  Mid: "bg-secondary text-foreground",
  Senior: "bg-brick-red text-white",
  Staff: "bg-[color:var(--case-border)] text-plastic-white",
};

function ScenarioCard({
  s,
  isSolved,
  onToggleSolved,
}: {
  s: Scenario;
  isSolved: boolean;
  onToggleSolved: () => void;
}) {
  const [phase, setPhase] = useState<"question" | "hint" | "answer">("question");

  return (
    <article
      className={`bg-card border-2 border-[color:var(--case-border)] rounded-2xl brick-shadow-sm p-6 md:p-7 flex flex-col transition-all ${
        isSolved ? "ring-4 ring-brick-green ring-offset-2 ring-offset-brick-blue" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span
          className={`${catColor[s.category]} border-2 border-[color:var(--case-border)] rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest`}
        >
          {s.category}
        </span>
        <span
          className={`${diffColor[s.difficulty]} border-2 border-[color:var(--case-border)] rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest`}
        >
          {s.difficulty}
        </span>
        {isSolved && (
          <span className="bg-brick-green text-white border-2 border-[color:var(--case-border)] rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest">
            ✓ Solved
          </span>
        )}
      </div>

      <h3 className="font-display font-bold text-xl md:text-2xl mb-3">
        {s.title}
      </h3>

      <div className="bg-secondary/50 border-l-4 border-[color:var(--case-border)] rounded-md p-4 mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-foreground/55 mb-1">
          Scene
        </p>
        <p className="text-foreground/85 leading-relaxed text-sm md:text-base">
          {s.scene}
        </p>
      </div>

      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-brick-red mb-1">
          Your turn
        </p>
        <p className="font-display font-bold text-lg leading-snug">
          {s.question}
        </p>
      </div>

      {phase !== "question" && (
        <div className="bg-brick-yellow/40 border-2 border-[color:var(--case-border)] rounded-xl p-4 mb-4">
          <p className="text-xs font-bold uppercase tracking-widest mb-1">
            💡 Hint
          </p>
          <p className="text-foreground/85 italic">{s.hint}</p>
        </div>
      )}

      {phase === "answer" && (
        <div className="bg-brick-green/15 border-2 border-brick-green rounded-xl p-5 mb-4 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brick-green mb-1">
              ✓ Answer
            </p>
            <p className="text-foreground/90 leading-relaxed">{s.answer}</p>
          </div>

          {s.commands && s.commands.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-foreground/65 mb-2">
                Commands
              </p>
              <pre className="bg-[color:var(--case-border)] text-plastic-white font-mono text-xs md:text-sm leading-relaxed p-4 rounded-lg overflow-x-auto whitespace-pre">
                {s.commands.join("\n")}
              </pre>
            </div>
          )}

          <div className="bg-card border-2 border-[color:var(--case-border)] rounded-lg p-3">
            <p className="text-xs font-bold uppercase tracking-widest text-brick-red mb-1">
              Takeaway
            </p>
            <p className="text-sm text-foreground/85">{s.takeaway}</p>
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-wrap gap-3 pt-2">
        {phase === "question" && (
          <>
            <button
              type="button"
              onClick={() => setPhase("hint")}
              className="bg-brick-yellow text-[color:var(--case-border)] border-2 border-[color:var(--case-border)] px-4 py-2 rounded-lg font-display font-bold text-sm brick-shadow-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            >
              Show Hint
            </button>
            <button
              type="button"
              onClick={() => setPhase("answer")}
              className="bg-brick-red text-white border-2 border-[color:var(--case-border)] px-4 py-2 rounded-lg font-display font-bold text-sm brick-shadow-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            >
              Reveal Answer
            </button>
          </>
        )}
        {phase === "hint" && (
          <>
            <button
              type="button"
              onClick={() => setPhase("question")}
              className="bg-card text-foreground border-2 border-[color:var(--case-border)] px-4 py-2 rounded-lg font-display font-bold text-sm brick-shadow-sm transition-all"
            >
              Hide Hint
            </button>
            <button
              type="button"
              onClick={() => setPhase("answer")}
              className="bg-brick-red text-white border-2 border-[color:var(--case-border)] px-4 py-2 rounded-lg font-display font-bold text-sm brick-shadow-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            >
              Reveal Answer
            </button>
          </>
        )}
        {phase === "answer" && (
          <button
            type="button"
            onClick={() => setPhase("question")}
            className="bg-card text-foreground border-2 border-[color:var(--case-border)] px-4 py-2 rounded-lg font-display font-bold text-sm brick-shadow-sm transition-all"
          >
            ↺ Try Again
          </button>
        )}
        <button
          type="button"
          onClick={onToggleSolved}
          aria-pressed={isSolved}
          className={`ml-auto border-2 border-[color:var(--case-border)] px-4 py-2 rounded-lg font-display font-bold text-sm brick-shadow-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all ${
            isSolved
              ? "bg-brick-green text-white"
              : "bg-card text-foreground hover:bg-brick-green/15"
          }`}
        >
          {isSolved ? "✓ Solved" : "Mark as Solved"}
        </button>
      </div>
    </article>
  );
}

export default function RealWorldScenarios() {
  const [filter, setFilter] = useState<Category>("All");
  const { solved, toggle, reset } = useSolved();

  const visible =
    filter === "All" ? scenarios : scenarios.filter((s) => s.category === filter);

  const total = scenarios.length;
  const solvedCount = scenarios.filter((s) => solved.has(s.id)).length;
  const pct = total === 0 ? 0 : Math.round((solvedCount / total) * 100);

  return (
    <section
      id="scenarios"
      className="py-24 px-6 bg-brick-blue text-plastic-white"
    >
      <div className="max-w-5xl mx-auto text-center mb-10">
        <div className="inline-block bg-brick-yellow text-[color:var(--case-border)] px-4 py-1 border-2 border-[color:var(--case-border)] rounded-full font-bold text-sm uppercase mb-6 brick-shadow-sm">
          Real-World Scenarios
        </div>
        <h2 className="font-display font-bold text-4xl md:text-5xl mb-4 text-plastic-white">
          What senior DevOps engineers actually fix at 3 a.m.
        </h2>
        <p className="text-lg text-plastic-white/80 max-w-2xl mx-auto">
          Real problems from real on-call shifts. Read the scene, think about
          your move, then check the answer with the exact commands a senior
          would run.
        </p>
      </div>

      {/* Progress tracker */}
      <div className="max-w-3xl mx-auto bg-plastic-white text-foreground border-2 border-[color:var(--case-border)] rounded-2xl p-5 mb-8 brick-shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-foreground/60">
              Your Progress
            </p>
            <p className="font-display font-bold text-xl">
              {solvedCount} / {total} solved
              <span className="text-foreground/55 font-medium text-base"> · {pct}%</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {solvedCount === total && total > 0 && (
              <span className="bg-brick-green text-white border-2 border-[color:var(--case-border)] rounded-md px-3 py-1 text-xs font-bold uppercase tracking-widest">
                🏆 All Solved!
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                if (solvedCount === 0) return;
                if (confirm("Reset all scenario progress?")) reset();
              }}
              disabled={solvedCount === 0}
              className="bg-card border-2 border-[color:var(--case-border)] px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
        <div className="h-3 w-full bg-secondary border-2 border-[color:var(--case-border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-brick-green transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-foreground/55 mt-2">
          Progress is saved on this device — close the tab and resume anytime.
        </p>
      </div>

      <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-2 mb-10">
        {categories.map((c) => {
          const active = filter === c;
          const catSolved =
            c === "All"
              ? solvedCount
              : scenarios.filter((s) => s.category === c && solved.has(s.id)).length;
          const catTotal =
            c === "All" ? total : scenarios.filter((s) => s.category === c).length;
          return (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={`px-4 py-2 border-2 border-[color:var(--case-border)] rounded-lg font-display font-bold text-sm uppercase tracking-wider transition-all ${
                active
                  ? "bg-brick-red text-white brick-shadow-sm"
                  : "bg-plastic-white text-[color:var(--case-border)] hover:bg-brick-yellow"
              }`}
            >
              {c}
              <span className={`ml-2 text-[10px] ${active ? "opacity-80" : "opacity-60"}`}>
                {catSolved}/{catTotal}
              </span>
            </button>
          );
        })}
      </div>

      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
        {visible.map((s) => (
          <ScenarioCard
            key={s.id}
            s={s}
            isSolved={solved.has(s.id)}
            onToggleSolved={() => toggle(s.id)}
          />
        ))}
      </div>
    </section>
  );
}
