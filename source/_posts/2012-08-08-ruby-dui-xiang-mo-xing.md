--- 
categories: 
  - ruby
comments: true
layout: post
published: true
status: publish
tags: []
title: ruby对象模型
type: post
---
摘抄《Ruby元编程》

读完这书，有种豁然开朗的感觉，尤其是那几个图片。
以下是书中对ruby对象模型的总结，一共7条，我这里写了6条，括号中为我的理解

只有一种对象——要么是普通对象，要么是模块

只有一种模块——可以是普通模块、类、单例类、eigenclass、代理类

只有一个方法——存在模块或类中
（所谓的类方法，无非是它eigenclass的实例方法）

每个对象（普通对象，类）都有自己的“真正的类”——要么是普通类，要么是eigenclass

除了BasicObject(1.8中为Object)无超类外，每个类只有一个超类
（这里有个很有趣的事，BasicObject的eigenclass的超类是Class）

一个对象的eigenclass的超类是这个对象的类；一个类的eigenclass的超类事这个类的超类的eigenclass。
（子类继承父类类方法的原理）

