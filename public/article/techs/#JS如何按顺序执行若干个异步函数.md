#JS如何按顺序执行若干个异步函数

##起因

事情的起因是这样，我正在做一个表单验证的angular指令。在这个指令中，需要用户指定一些验证规则，这些验证规则是一个同步函数或者异步函数。用户指定完这些规则后，指令应该按照顺序执行这些函数。最后统一返回true或者false，表示验证通过或者不通过。

其中一个步骤差不多是这样的。

	function validate(input,rules){
		var valid=true
	
		for (var i = rules.length - 1; i >= 0; i--) {
			if(rules[i][input]===false){
				valid=false
				break
			}
		}
		return valid
	}

	validate("123@qq.com",[notEmpty,unique,email])


input是用户输入，rules是一个数组，里面是一些定义好的验证规则，这些规则是会返回true或者false的方法。validate的步骤就是循环调用rules里的方法，一旦有一个返回了false，就直接退出循环，并且直接返回valid的值。

这段代码有一个很大的问题，就是无法容纳异步验证。那就是如果验证方法是异步的，那么这个方法就会脱离整个for循环，而for循环会忽略这个方法。等这个方法返回时，for循环早已结束，并且已经返回valid了。

因此，我们的需求就是能够同步地按顺序调用rules里的方法。有经验的程序员一下子就会想到Promise。没错，promise可以很简单地实现同步执行异步函数。就像这样：

	notEmpty(input).then(unique).then(email)

但是这样还是有两个问题：

1. 并不是所有的验证方法都是异步的。
2. 我们实际上并不知道到底会有多少个验证规则。

所以，总结一下，我们的需求实际上是：**按数组顺序同步执行若干个同步或异步函数并返回。**

##准备阶段
要实现这个目的，我们可以这么做:

1. 把数组里的每个普通函数都先转换为promise函数
2. 再依次执行每个promise函数

方法如下：

首先我们准备好一些实验用的函数，这些函数有的是异步的，有的是同步的。
	
	function async1(str,callback){
		setTimeout(function () {
	        console.log("I'm the 1st!")
	        if(callback){
	        	callback()
	        }
	    }, 500);
	}
	
	function async2(str,callback){
		setTimeout(function () {
	        console.log("I'm the 2nd!")
	        if(callback){
	        	callback()
	        }
	    }, 300);
	}
	
	function async3(str,callback){
		setTimeout(function () {
	        console.log("I'm the 3rd!")
	        if(callback){
	        	callback()
	        }
	    }, 700);
	}
	
	function sync4(str,callback){
	    console.log("I'm the 4th sync!")
	    if(callback){
	    	callback()
	    }
	}
	
	function async5(str,callback){
		setTimeout(function () {
	        console.log("I'm the 5th!")
	        if(callback){
	        	callback()
	        }
	    }, 100);
	}
	
	function async6(str,callback){
		setTimeout(function () {
	        console.log("I'm the 6th!")
	        if(callback){
	        	callback()
	        }
	    }, 600);
	}
	
	function sync7(str,callback){
	    console.log("I'm the 7th sync!")
	    if(callback){
	    	callback()
	    }
	}
	
	var funcs=[async1,async2,async3,sync4,async5,async6,sync7]
	
	for (var i = 0; i < funcs.length ; i++) {
		funcs[i]()
	};
	
大家可以先试试把上面这些代码复制到控制台中运行，结果应该是这样的。两个同步的函数先返回，然后异步函数按照时间延迟多少先后返回。


	I'm the 4th sync!
	I'm the 7th sync!
	I'm the 5th!
	I'm the 2nd!
	I'm the 1st!
	I'm the 6th!
	I'm the 3rd!

##解决方案
我们要做的就是把所有这些函数全都用promise包装，然后依次执行。

首先来看promisify方法，它的作用是把一个普通函数包装成返回promise对象的函数：

	function promisify(func) {
	
		return function(){
			var that = this
			var args = Array.prototype.slice.call(arguments)//缓存传入的参数
			
		    return new Promise(function (res,rej) {
		    
		    	var callback= function(){
		    		//把参数传递给下一个promise对象
			        res(args);
		    	}
		    	
		    	//执行原来的函数
		    	func.apply(that, args.concat([callback]))
		    })	
		}
	}
	
然后是promisifyArray方法，作用是把整个数组的函数都promise化:
	
	function promisifyArray (funcs) {
		var asyncs=[]
		
		for (var i = 0; i < funcs.length ; i++) {
			asyncs[i] = promisify(funcs[i])
		}
		
		return asyncs
	}
	
最后是excute方法，作用是依次执行数组里的promise方法：
	
	//excute接受的args参数会传递给数组里所有的函数
	function excute(asyncs,args) {
		var promise
		
		for (var i = 0; i < asyncs.length ; i++) {
		
			if(i===0){
			
				//但是目前就只有这第一个promise可以接受参数，之后的都不能接受参数了。
				console.log(args)
				promise = asyncs[0].apply(null,[args])
				
			} else {
				
				//因为如果在按照上面的方法做的话，
				//asyncs[i].apply(null,[args])会立刻执行
				//结果就还是会按照异步顺序来执行了，
				//then只能接受待执行的方法，而不能接受运行结果
				promise = promise.then(asyncs[i])
				
			}
			
		}
	}

现在把上面三个函数复制到控制台里运行，再执行下面的代码:

	var promises=promisifyArray(funcs)
	excute(promises)
	
结果正是我们想要的，所有的函数都按数组顺序返回了：

	I'm the 1st!
	I'm the 2nd!
	I'm the 3rd!
	I'm the 4th sync!
	I'm the 5th!
	I'm the 6th!
	I'm the 7th sync!


##不足之处
但是这个方法目前还不完美：

1. 目前无法传递参数给每一个函数，只能传给第一个。
2. 还是要原始的方法里提供callback

我还在寻找更好的办法。