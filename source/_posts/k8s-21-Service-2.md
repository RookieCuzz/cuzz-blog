---
title: k8s-21-Service-2
date: 2025-08-29 10:22:30
tags:
---


1) **查看 Pod 的 IP**  
   `kubectl get deploy -o wide` 不会显示 Pod IP，请用：  
   ```
   kubectl get pod -o wide
   ```
   （Deployment 只显示副本与镜像等汇总信息。）

2) **创建/更新清单**  
   建议用 `kubectl apply -f`（幂等、可重复执行），而不是只用 `create`。

3) **Service DNS 名称**  
   格式正确：`<service>.<namespace>.svc.cluster.local`（同命名空间内可直接用短名 `<service>` 访问）。

4) **在集群内做 DNS 测试**  
   要进**容器内部**测试（CoreDNS 只解析集群内域名）。

5) **nslookup 的用法**
- 正确姿势：`nslookup enginex-svc`（查 *名字 → IP*）。
- 不要指望 `nslookup <ClusterIP>` 能反查出名字（Service 通常**没有**反向 PTR 记录，反查多半是空）。

6) **测试镜像选择**  
   有些 busybox 版本的 `nslookup` 有坑，面试/考题常用 `busybox:1.28` 或专用 `dnsutils`。

7) **负载分发认知**  
   ClusterIP 背后由 kube-proxy（iptables 或 IPVS）转发；整体近似轮询，但受连接跟踪等影响并非“严格轮询”。

---

# 一套能直接跑的示例

## 1）Deployment（3 个副本，每个 Pod 2 容器）
`services/multi-container.yaml`：
```yaml
apiVersion: v1
kind: Deployment
metadata:
  name: nginx-demo-deploy
spec:
  #不写默认是1
  replicas: 3
  selector:
    app: nginx
  #pod模板
  template:
    metadata:
      name: nginx-demo
      labels:
        app: nginx
        env: prod
        release: v1.0
    #pod模板下的容器
    spec:
      containers:
        - name: read-container
          image: dd3av2v4785k4i.xuanyuan.run/library/nginx:latest
          ports:
            - containerPort: 80
          resources:
            limits:
              cpu: "0.2"  # 1core*20%
              memory: "300Mi"
          volumeMounts:
            - name: shared-data
              mountPath: /usr/share/nginx/html
        - name: write-container
          image: dd3av2v4785k4i.xuanyuan.run/library/alpine:latest
          command: ["/bin/sh"]
          args: ["-c","while true;do date >> /var/log/index.html;sleep 10;done"]
          volumeMounts:
            - mountPath: /var/log
              name: shared-data



```

应用并查看：
```
kubectl apply -f services/multi-container.yaml
kubectl get deploy enginex-deploy -o wide
kubectl get pod -l app=enginex -o wide
```
> 说明：用 Pod 的 `-o wide` 看到 **Pod IP**，而不是从 Deployment 直接看。

## 2）ClusterIP Service
`services/clusterIP.yaml`：
```
apiVersion: v1
kind: Service
metadata:
name: enginex-svc
labels:
app: enginex
spec:
selector:
app: enginex
environment: production
ports:
- name: http
port: 80        # 对集群内暴露的端口（客户端连这个）
targetPort: 80  # 容器内应用监听端口（必须与 Nginx 匹配）
type: ClusterIP     # 可省略，默认就是 ClusterIP
```

应用与验证：
```
kubectl apply -f services/clusterIP.yaml
kubectl get svc enginex-svc -o wide
kubectl describe svc enginex-svc
```
> 解释：Service 选择器通过标签把 3 个 Pod 收进 endpoints；kube-proxy（iptables/IPVS）做四层转发。

## 3）DNS 与连通性测试（推荐两种镜像）

### 方案 A：busybox（考试常见）
```
kubectl run dns-test --image=busybox:1.28 -it --rm --restart=Never -- sh
# 容器内执行：
nslookup enginex-svc
wget -qO- http://enginex-svc
exit
```
> 注意：`busybox` 里是 `sh` 不是 `bash`；某些版本 `nslookup` 有兼容性问题，固定用 `1.28` 更稳。

### 方案 B：dnsutils（工具更全）
```
kubectl run dnsutils --image=registry.k8s.io/e2e-test-images/jessie-dnsutils:1.3 -it --rm --restart=Never -- bash
# 容器内执行：
nslookup enginex-svc
curl -s http://enginex-svc
exit
```
> 只能在**集群内**解析服务名；集群外机器无法解析 `*.svc.cluster.local`。

---

# 常见易错点对照表

- **“nslookup + IP 反查名字”**：对 Service/Pod 通常**得不到**结果（无 PTR 记录或仅在特定 headless 场景有限支持）。正确做法是**查名字**得到 IP。
- **Selector 与 Pod 标签不一致**：Service 无 endpoints，`kubectl describe svc` 能看出来。
- **以为 ClusterIP 永久不变**：删除 Service 再创建，IP 很可能变化；用 **名字** 访问即可规避。
- **“严格轮询”执念**：底层是 L4 转发 + 连接跟踪，表现近似 RR，不保证每次完全均匀。可用 IPVS 获得更稳定的性能与策略选择。

---

# 流程的小修小补（逐条对应）

- “查看部署对象状态会显示 3 个 Pod 的 IP 地址” → **改为**：Deployment 不显示 Pod IP；用 `kubectl get pod -o wide`。
- “nslookup IP 得到 DNS 名称” → **改为**：查 Service 名得到 IP；IP 反查通常不可用。
- “临时容器命令 `-- bash`” → **改为**：busybox 用 `-- sh`；若要 `bash`，请用 dnsutils 这类镜像。

---
