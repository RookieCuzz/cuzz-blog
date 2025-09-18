---
title: TCP vs UDP
date: 2025-09-18 10:11:30
tags:
---
# TCP vs UDP

##  TCP
transmission control Protocol(传输控制协议)
面向连接,可靠,按顺序传送,流式
## UDP 
user datagram protocol(用户数据报协议)
无连接,不保证可靠性,不保证顺序,以报文为单位



### 选择
- 如果要求数据可靠性高,不能用丢包/乱序/重复问题,那么选择TCP(金融,文件下载)
- 如果要求实时性高,能允许少量丢包,追求速度和延迟,那么选UDP(视频电话,直播,DNS)

