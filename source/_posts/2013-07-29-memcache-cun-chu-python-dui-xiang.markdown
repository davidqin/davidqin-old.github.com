---
layout: post
title: "memcache存储python对象"
date: 2013-07-29 16:32
comments: true
categories: 
---

python对象是使用pickle进行序列化进而存储进入memcached中的

##问题:

已经缓存的实例对象是否可以使用新版本代码中的新增实例方法。


##测试代码：

初始版本代码

```python
import pickle as p

class A(object):
	def __init__(self):
		self.name = "david"
		
a = A()
f = open('p.txt', 'w')

p.dump(a,f)
f.close()
```

新版本代码

```python
import pickle as p

class A(object):
	def __init__(self):
		self.name = "david"
		self.age = 23
	
	def speak(self):
		print "hello world"
		
f = open('p.txt', 'r')
a = p.load(f)
f.close()

a.name      #=> 'david'
a.age       #=> AttributeError: 'A' object has no attribute 'age'
a.speak()   #=> 'hello world'
```

##结论：

在dumps自定义类或者含有自定义类的对象时，pickle会将自定义类所在程序文件的\__name__值和类名称也保存起来。

Unpickler在load文件中的序列化字符串的时候会寻找load环境中的同名类型。

不存在的时候会抛出AttributeError: 'module' object has no attribute 'A'异常。

至于对象的属性，是对象特有的，所以age属性没有是很容易理解的。

speak函数是运行时环境中的，所以load的a对象也可以调用。