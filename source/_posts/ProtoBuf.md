---
title: ProtoBuf
date: 2025-10-20 22:30:00
tags:
---
# 什么是ProtoBuf?
- Protobuf 是由 Google 开发的一种 语言无关、平台无关、可扩展 的机制，用于序列化结构化数据。     
- 它类似于 JSON 或 XML，但它是 二进制格式，因此通常更 紧凑、更高效。    
- 使用流程通常是：先用 .proto 文件定义数据结构（消息、字段、编号等,语法类似Go），然后用 protoc 等编译器生成各语言对应的读／写代码     

# 优势在哪
- 跨语言、跨平台：你定义好一次，多个语言（比如 Java、Python、Go、C++ 等）都能使用生成的代码读写数据    
- 高性能 / 紧凑：比起文本格式（JSON／XML）体积小、序列化／反序列化快、网络或磁盘开销少。
- 可演进的数据格式：在不破坏已有系统的情况下，可以给消息结构增加新字段、删除旧字段，具有良好的向后／向前兼容性（如果按照官方建议规范做的话）。

# 为什么高性能
Protobuf 的“高效”主要来自：varint 对小整数的压缩、按需省略缺省字段、
LEN 的统一 framing、以及 wire type 让未知字段可安全跳过。是否“节省”，高度依赖数据分布：小整数/稀疏消息收益最大；大整数/负数多则应考虑 sint* 或 fixed*
Protocol Buffers 在其二进制 “wire format” 中 不存储字段名称（即字段名 string） — 它是通过字段编号 (field_number) + wire_type 的 tag 来识别字段

**VARINT**
int32/int64/uint32/uint64：非负数可较小编码；但带负数（尤其用 int…）可能占用很多字节。              
sint32/sint64：利用 ZigZag 编码，把负数映射成无符号较小值，从而节省空间。             
bool：编码为 0 或 1，作为一个 varint。              
enum：本质是整数，也按 varint 编码。 

**LEN**
string：UTF-8 编码字节序列。
bytes：任意字节序列。
embedded message：一个消息类型在另一个消息中，序列化后当作 bytes 插入。
packed repeated：例如 repeated int32 x = N  （在 proto3 中默认对合适的标量走 packed 路径）：多个元素合并在一个 LEN 中。



**I32/I64**
对于 fixed32/fixed64/sfixed32/sfixed64/float/double：
因为固定字节数，所以适合“数值大小已知范围 / 不用 varint 压缩”场景。   
（例如float 和double）


# 示例 (Go作为服务端,Java作为客户端)
