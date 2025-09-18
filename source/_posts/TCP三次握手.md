---
title: TCP三次握手
date: 2025-09-18 11:12:29
tags:
---

# TCP三次握手
TCP三次握手主要是为了保证通信双方都具备正常的接收能力.    
就好像两个人要正常聊天肯定要确定彼此都是不聋不哑.
假设A,B双方通信.
A肯定要确认其收 发数据包 能力正常
A发送一个Seq包给 B. 假设B响应了一个ACK包. 那么A就知道自己的发送能力正常.因为B接收到且返回了响应. A能接收到B的响应包则进一步验证了A的接收能力正常.(那么 A就完成了 收发能力的验证)
接下去就要验证B的收发能力,由于B接收了A的Seq包,那么证明其接收能力正常,接下去还差一个发送能力没验证.故A需要响应B的ACK包,若B接收到ACK的响应包则证明其发送能力也正常.
这就构成了TCP的三次握手.
<img src="https://github.com/RookieCuzz/cuzz-blog/blob/main/source/_posts/images/31.png?raw=true" alt="图" width="1200" />
