---
layout: post
title: "wget-a-website"
date: 2013-04-09 20:01
comments: true
---

##### 原帖：
[http://jnote.cn/blog/shell/wget-download.html](http://jnote.cn/blog/shell/wget-download.html)

##### 需求：
spine.js 的文档是需要翻墙的。用如下方式下载整个网站的资源：

    wget -r -p -k -nc -o down.log http://spinejs.com/docs/

##### wget命令：
 - -U 修改agent，伪装成IE货firefox等
 
    如 "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; GTB5)"
 - -r 递归；对于HTTP主机，wget首先下载URL指定的文件，然后（如果该文 - 件是一个HTML文档的话）递归下载该文件所引用（超级连接）的所有文件（递 归深度由参数-l指定）。对FTP主机，该参数意味着要下载URL指定的目录中的所有文件，递归方法与HTTP主机类似。
 
 - -c 指定断点续传功能。实际上，wget默认具有断点续传功能，只有当你使用别的ftp工具下载了某一文件的一部分，并希望wget接着完成此工作的时候，才需要指定此参数。
 
 - -nc 不下载已经存在的文件
 
 - -np 表示不跟随链接，只下载指定目录及子目录里的东西；
 
 - -p 下载页面显示所需的所有文件。比如页面中包含了图片，但是图片并不在/yourdir目录中，而在/images目录下，有此参数，图片依然会被正常下载。
 
 - -k 修复下载文件中的绝对连接为相对连接，这样方便本地阅读。
 - -o 输出log