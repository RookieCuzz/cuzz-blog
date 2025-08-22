---
title: kafka 部署
date: 2025-08-22 09:56:40
tags:
---

# 1.环境概览
**宿主机信息**
 
- 操作系统: Windows Server 2022 Datacenter
- 配置: Intel(R) Core(TM) i9-14900K 128G
- 网络:公网IP 

**Hyperv虚拟机信息**
- 操作系统: Ubuntu 22.04.3 LTS
- 网络:外部网络(192.168.110.16)

**虚拟机内Docker环境**
- DockerEngine版本: 28.1.1
- 网络:bridge


# 2.流程
## 2.1设置宿主机的防火墙允许公网TCP端口       
需要开放宿主机端口,让外网的kafka客户端可以访问kafka.   

```powershell
New-NetFirewallRule -DisplayName "Kafka 29092 Public" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 29092 -Profile Public
```
## 2.2 设置宿主机->虚拟机的端口转发
需要设置NAT让外网访问宿主机29092端口的流量被转发到虚拟机
```powershell
netsh interface portproxy add v4tov4 listenport=29092 listenaddress=0.0.0.0 connectport=29092 connectaddress=192.168.110.16
```
## 2.3 虚拟机需要关闭29092端口的防火墙

```bash
#检查防火墙状态
sudo ufw status
#放行端口
sudo ufw allow 29092/tcp
#由于虚拟机处于内网环境也可以直接sudo ufw disable
```
## 2.4 Docker容器配置
KAFKA_LISTENERS定义 Kafka 服务实际监听的地址和端口  
KAFKA_ADVERTISED_LISTENERS定义 Kafka 对外广播的地址，客户端需要通过这个地址访问 Kafka。

```yml
services:
  zookeeper:
    image: zookeeper:3.7.0  # 使用更新的版本
    ports:
      - "2181:2181"
    environment:
      - ALLOW_ANONYMOUS_LOGIN=yes  # 如果需要匿名登录
    networks:
      - kafka-network

  kafka:
    image: wurstmeister/kafka:latest
    ports:
      - "9092:9092"        # 内部 Docker 网络使用
      - "29092:29092"      # 外部访问用映射端口
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://xxx.xxx.xxx.xxx:29092
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:29092
      KAFKA_BROKER_ID: 1
    depends_on:
      - zookeeper
    networks:
      - kafka-network
networks:
  kafka-network:
    driver: bridge
```
# 3.网络拓扑图
<img src="https://github.com/RookieCuzz/cuzz-blog/blob/main/source/_posts/images/15.png?raw=true" alt="图" width="1200" />


# 4.建议与注意事项(AI)

网络配置：确保 Kafka 的监听地址和广播地址正确配置，以便客户端能够正确连接。(VPN不要开启虚拟网卡)

防火墙设置：检查宿主机和虚拟机的防火墙设置，确保 Kafka 的端口开放。

资源分配：确保宿主机和虚拟机有足够的资源（如内存和 CPU）来运行 Kafka 和 ZooKeeper。

日志监控：定期检查 Kafka 和 ZooKeeper 的日志，以便及时发现并解决问题。