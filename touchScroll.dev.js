/*
 * TouchScroll v1.1
 * By qiqiboy, http://www.qiqiboy.com, http://weibo.com/qiqiboy, 2012/12/11
 */
(function(window,undefined){
	"use strict";
	
	var hasTouch=("createTouch" in document) || ('ontouchstart' in window),
		testStyle=document.createElement('div').style,
		testVendor=(function(){
			var cases={
				'OTransform':['-o-'],
				'WebkitTransform':['-webkit-'],
				'MozTransform':['-moz-'],
				'msTransform':['-ms-'],
				'transform':['']
			},prop;
			for(prop in cases){
				if(prop in testStyle)return cases[prop];
			}
			return false;
		})(),
		sg={h:['Width','left','right'],v:['Height','top','bottom']},
		cssVendor=testVendor&&testVendor[0],
		toCase=function(str){
			return (str+'').replace(/^-ms-/, 'ms-').replace(/-([a-z]|[0-9])/ig, function(all, letter){
				return (letter+'').toUpperCase();
			});
		},
		testCSS=function(prop){
			var _prop=toCase(cssVendor+prop);
			return (prop in testStyle)&& prop || (_prop in testStyle)&&_prop;
		},
		is3D=testCSS('perspective'),
		transform=testCSS('transform'),
		parseArgs=function(arg,dft){
			for(var key in dft){
				if(typeof arg[key]=='undefined'){
					arg[key]=dft[key];
				}
			}
			return arg;
		},
		each=function(arr,func){
			var i=0,j=arr.length;
			for(;i<j;i++){
				if(func.call(arr[i],i,arr[i])===false){
					break;
				}
			}
		},
		returnFalse=function(evt){
			evt=TouchScroll.fn.eventHook(evt);
			evt.preventDefault();
		},
		startEvent=hasTouch ? "touchstart" : "mousedown",
		moveEvent=hasTouch ? "touchmove" : "mousemove",
		endEvent=hasTouch ? "touchend" : "mouseup",
		overEvent=hasTouch ? "touchstart" : "mouseover",
		outEvent=hasTouch ? "touchend" : "mouseout",
		
		nextFrame=(function(){
			return window.requestAnimationFrame ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame ||
				window.oRequestAnimationFrame ||
				window.msRequestAnimationFrame ||
				function(callback){ return setTimeout(callback, 16); };
		})(),
		cancelFrame=(function(){
			return window.cancelRequestAnimationFrame ||
				window.webkitCancelAnimationFrame ||
				window.webkitCancelRequestAnimationFrame ||
				window.mozCancelRequestAnimationFrame ||
				window.oCancelRequestAnimationFrame ||
				window.msCancelRequestAnimationFrame ||
				clearTimeout;
		})(),
		
		contains=function(p,c){  
			return p.contains ? p != c && p.contains(c) : !!(p.compareDocumentPosition(c) & 16);  
		},
		
		TouchScroll=function(id,cfg){
			if(!(this instanceof TouchScroll)){
				return new TouchScroll(id,cfg);
			}
			
			if(typeof id!='string' && !id.nodeType){
				cfg=id;
				id=cfg.id;
			}
			if(!id.nodeType){
				id=document.getElementById(id);
			}
			this.cfg=parseArgs(cfg||{},this._default);
			this.container=id;
			if(this.container){
				this.setup();
			}
		}

	TouchScroll.fn=TouchScroll.prototype={
		version:1.1,
		//默认配置
		_default: {
			'id':'slider', //幻灯容器的id,
			'width':5, //滚动条宽度
			'minLength':20, //滚动条最小长度
			'opacity':0.8, //滚动条透明度
			'color':'black', //滚动条颜色
			'hScroll':'auto', //横向滚动
			'vScroll':'auto', //纵向滚动
			'scrollBar':'auto',//是否显示滚动条
			'vOffset':0, //横向偏移值
			'hOffset':0, //横向偏移值
			'mouseWheel':false,
			'keyPress':false,
			'onRefresh':new Function
		},
		//设置OR获取节点样式
		css:function(elem,css){
			if(typeof css=='string'){
				var style=document.defaultView && document.defaultView.getComputedStyle && getComputedStyle(elem, null) || elem.currentStyle || elem.style || {};
				if(css=='opacity' && !("opacity" in testStyle)){
					var ft=style.filter;
					return ft&&ft.indexOf('opacity')>=0&&parseFloat(ft.match(/opacity=([^)]*)/i)[1])/100+''||'1';
				}
				return style[toCase(css)];
			}else{
				var prop,value;
				for(prop in css){
					value=css[prop];
					if(prop=='float'){
						prop=("cssFloat" in testStyle) ? 'cssFloat' : 'styleFloat';
					}else if(prop=='opacity' && !("opacity" in testStyle)){
						prop='filter';
						value='alpha(opacity='+(parseFloat(value)*100)+')';
					}else{
						prop=toCase(prop);
					}
					elem.style[prop]=value;
				}
			}
			return this;
		},
		//绑定事件
		addListener:function(e, n, o, u){
			if(e.addEventListener){
				e.addEventListener(n, o, u);
				return true;
			} else if(e.attachEvent){
				e.attachEvent('on' + n, o);
				return true;
			}
			return false;
		},
		removeListener:function(e, n, o, u){
			if(e.addEventListener){
				e.removeEventListener(n, o, u);
				return true;
			} else if(e.attachEvent){
				e.detachEvent('on' + n, o);
				return true;
			}
			return false;
		},
		eventHook:function(origEvt){
			var evt={},
				props="changedTouches touches scale target view type which char charCode key keyCode clientX clientY relatedTarget fromElement offsetX offsetY pageX pageY toElement".split(" ");
			origEvt=origEvt||window.event;
			each(props,function(){
				evt[this]=origEvt[this];
			});
			evt.target=origEvt.target||origEvt.srcElement||document;
			if(evt.target.nodeType===3){
				evt.target=evt.target.parentNode;
			}
			evt.preventDefault=function(){
				origEvt.preventDefault && origEvt.preventDefault();
				evt.returnValue=origEvt.returnValue=false;
			}
			if(hasTouch&&evt.touches){
				evt.touches=evt.touches.length?evt.touches:evt.changedTouches;
				evt.pageX=evt.touches.item(0).pageX;
				evt.pageY=evt.touches.item(0).pageY;
			}else if(typeof origEvt.pageX=='undefined'){
				var doc=document.documentElement,
					body=document.body;
				evt.pageX=origEvt.clientX+(doc&&doc.scrollLeft || body&&body.scrollLeft || 0)-(doc&&doc.clientLeft || body&&body.clientLeft || 0);
				evt.pageY=origEvt.clientY+(doc&&doc.scrollTop  || body&&body.scrollTop  || 0)-(doc&&doc.clientTop  || body&&body.clientTop  || 0);
			}
			evt.origEvent=origEvt;
			return evt;
		},
		//修正函数作用环境
		bind:function(func, obj){
			return function(){
				return func.apply(obj, arguments);
			}
		},
		pos:function(){
			var css={},
				x=this.hOffset,
				y=this.vOffset;
			if(transform){
				css[transform]=is3D?'translate3d('+x+'px, '+y+'px, 0px)':'translate('+x+'px, '+y+'px)';
			}else{
				css['left']=x+'px';
				css['top']=y+'px';
			}
			return this.css(this.element,css);
		},
		setup:function(){
			var pst=this.css(this.container,'position'),
				css,that=this;
			each(['width','opacity','minLength','vOffset','hOffset'],function(i,prop){
				that.cfg[prop]=parseFloat(that.cfg[prop]);
			});
			this.css(this.container,{overflow:'hidden',position:pst=='static'?'relative':pst});
			this.element=document.createElement('div');
			this.element.className='touchscroll';
			this.hOffset=-this.cfg.hOffset;
			this.vOffset=-this.cfg.vOffset;
			css={position:transform?'':'relative',overflow:'hidden'};
			each(['Top','Right','Bottom','Left'],function(i,type){
				css['padding'+type]=that.css(that.container,'padding'+type);
				that.container.style['padding'+type]=0;
			});
			this.css(this.element,css);
			while(this.container.childNodes.length){
				this.element.appendChild(this.container.firstChild);
			}
			css={position:'absolute',overflow:'hidden',borderRadius:Math.ceil(this.cfg.width/2)+'px',backgroundColor:this.cfg.color,opacity:0};
			if(testCSS('boxSizing'))css[testCSS('boxSizing')]='border-box';
			if(testCSS('backgroundClip'))css[testCSS('backgroundClip')]='padding-box';
			if(hasTouch)css['pointer-events']='none';
			this.hbar=document.createElement('div');
			this.hbar.className='scrollbar hScrollBar';
			this.vbar=document.createElement('div');
			this.vbar.className='scrollbar vScrollBar';
			this.comment=document.createComment('\n Powered by TouchScroll v'+this.version+',\n author: qiqiboy,\n email: imqiqiboy@gmail.com,\n blog: http://www.qiqiboy.com,\n weibo: http://weibo.com/qiqiboy\n');
			this.container.appendChild(this.comment);
			this.container.appendChild(this.element);
			this.container.appendChild(this.hbar);
			this.container.appendChild(this.vbar);
			
			this.css(this.hbar,{bottom:'1px',height:this.cfg.width+'px'}).css(this.hbar,css);
			this.css(this.vbar,{right:'1px',width:this.cfg.width+'px'}).css(this.vbar,css);
			
			this.addListener(this.container,startEvent,this._start=this.bind(this.start,this),false);
			this.addListener(document,moveEvent,this._move=this.bind(this.move,this),false);
			this.addListener(document,endEvent,this._end=this.bind(this.end,this),false);
			this.addListener(this.container,'touchcancel',this._end,false);
			this.addListener(this.container,overEvent,this._toggleShow=this.bind(this.toggleShow,this),false);
			this.addListener(this.container,outEvent,this._toggleShow,false);
			if(this.cfg.mouseWheel){
				this.addListener(this.container,'mousewheel',this._mouseScroll=this.bind(this.mouseScroll,this),false);
				this.addListener(this.container,'DOMMouseScroll',this._mouseScroll,false);
			}
			if(this.cfg.keyPress){
				this.addListener(document,'keydown',this._keypress=this.bind(this.keypress,this),false);
			}
			this.addListener(window,'resize',this._resize=this.bind(function(){
				clearTimeout(this.resizeTimer);
				this.resizeTimer=setTimeout(this.bind(this.resize,this),100);
			},this),false);
			this.addListener(window,'orientationchange',this._resize,false);
			
			this.fadeToggle().resize();
		},
		resize:function(){
			return this.stop()
			.css(this.container,{visibility:'hidden'}).css(this.element,{width:'auto',height:'auto'})
			.resizeHandle('h').resizeHandle('v')
			.css(this.container,{visibility:'visible'});
		},
		resizeHandle:function(flag){
			var fixed=0,
				type=sg[flag][0],
				scroll=this.cfg[flag+'Scroll'],
				prop=type.toLowerCase(),
				total=this['inner'+type](this.element)-this.cfg[flag+'Offset'],
				client=this['inner'+type](this.container);
			if(this.container['offset'+type]){
				this[flag+'Scroll']=true;
				this[flag+'bar'].style.display='block';
				if(client>total){
					fixed=client-total;
					total=client;
				}
				this[prop]=client;
				this['total'+type]=total;
				this.element.style[prop]=fixed+this['get'+type](this.element)+'px';
				if(scroll===false || scroll!==true&&total==client){
					this[flag+'bar'].style.display='none';
					this[flag+'Scroll']=false;
				}
				this[flag+'FixLength']=this['padding'+type](this[flag+'bar'])+testCSS('boxSizing')?0:this['border'+type](this[flag+'bar']);
				this.fixBounce(flag)===false&&this.refresh(flag);
			}
			return this;
		},
		toggleShow:function(evt){
			evt=this.eventHook(evt);
			var fix,opacity,
				related,
           	 	type=evt.type;
			if(type=='mouseover'){
				related=evt.relatedTarget||evt.fromElement
			}else if(type=='mouseout'){
				related=evt.relatedTarget||evt.toElement
			}
			fix=!related || related.prefix!='xul' && !contains(this.container,related) && related!==this.container;
			if(hasTouch||fix){
				if(type==overEvent){
					this.mouseEnter=true;
				}else{
					this.mouseEnter=false;
				}
				this.fadeToggle();
			}
			return this;
		},
		fadeToggle:function(){
			var _this=this,
				old=Math.round(this.css(this.hbar,'opacity')*10)/10||0,
				end=this.cfg.scrollBar===false||this.cfg.scrollBar!==true&&!this.during&&!this.mouseEnter?0:this.cfg.opacity,
				change=end-old,
				animate=function(t,b,c,d){
					return -c * ((t=t/d-1)*t*t*t - 1) + b;
				},
				begin=0,
				start=+new Date,
				opacity,
				run=function(){
					if(begin<600){
						begin=Math.min(600,+new Date-start);
						opacity=animate(begin,old,change,600);
						_this.css(_this.hbar,{opacity:opacity});
						_this.css(_this.vbar,{opacity:opacity});
						_this.barTimer=nextFrame(run);
					}else{
						_this.css(_this.hbar,{opacity:end});
						_this.css(_this.vbar,{opacity:end});
					}
				}
			cancelFrame(_this.barTimer);
			change&&run();
			return this;
		},
		refresh:function(flag){
			var bar=this[flag+'bar'], //滚动条
				total=this['total'+sg[flag][0]], //视图总长度
				client=this[sg[flag][0].toLowerCase()], //视图可见长度
				origPos=this[flag+'Offset'], //当前的位置
				deftPos=-this.cfg[flag+'Offset'], //初始默认容差
				minLength=Math.max(this.cfg.width,this.cfg.minLength), //滚动条最小长度
				length=Math.max(parseFloat(client*client/total),minLength), //滚动条正常长度
				barPos=total-client>0?(deftPos-origPos)/(total-client)*(client-length)+'px':0,
				fixPos='auto',
				finallyPos=origPos,overDist;
			if(origPos>deftPos){
				barPos=0;
				overDist=origPos-deftPos;
				length=Math.max(this.cfg.width,length-overDist/client*length);
				finallyPos=overDist/(overDist/client+1)+deftPos;
			}else if(origPos<=client-total+deftPos){
				barPos='auto';
				fixPos=0,
				overDist=client-total+deftPos-origPos;
				length=Math.max(this.cfg.width,length-overDist/client*length);
				finallyPos=client-total+deftPos-overDist/(overDist/client+1);
			}
			bar.style[sg[flag][1]]=barPos;
			bar.style[sg[flag][2]]=fixPos;
			bar.style[sg[flag][0].toLowerCase()]=length-this[flag+'FixLength']+'px';
			this[flag+'Offset']=finallyPos;
			return this.pos();
		},
		stop:function(){
			cancelFrame(this.hTimer);
			cancelFrame(this.vTimer);
			clearTimeout(this.mouseTimer);
			return this;
		},
		scroll:function(x,y,speed){
			var _this=this,
				toX=this.hOffset-x,
				toY=this.vOffset-y;
			this.stop();
			this.mouseTimer=setTimeout(function(){
				_this.fixBounce('v');
			},100);
			return this.scrollTo(-toX,-toY,speed);
		},
		scrollTo:function(x,y,speed){
			var args=[-x,-y],
				cfg=['h','v'],
				i=0;
			for(;i<2;i++){
				if(this[cfg[i]+'Scroll']&&!isNaN(args[i])){
					this.slide(cfg[i],args[i],speed);
				}
			}
			return this;
		},
		slide:function(flag,cur,speed){
			var _this=this,
				type=this[sg[flag][2]],
				old=this[flag+'Offset'],
				cur,change,
				begin=0,
				start=+new Date,
				speed=speed==null?400:speed,//动画持续时间
				animate=function(t,b,c,d){ //缓动效果计算公式
					return -c * ((t=t/d-1)*t*t*t - 1) + b;
				},
				run=function(){
					if(begin<speed){
						begin=Math.min(speed,+new Date-start);
						_this[flag+'Offset']=animate(begin,old,change,speed);
						_this.refresh(flag);
						_this[flag+'Timer']=nextFrame(run);
					}else{
						_this[flag+'Offset']=cur;
						if(_this.fixBounce(flag)===false){
							_this.during=false;
							_this.refresh(flag);
							_this.fadeToggle();
						}
					}
				}
			cancelFrame(this[flag+'Timer']);
			this[flag+'Offset']=cur;
			this.refresh(flag);
			cur=this[flag+'Offset'];
			change=cur-old;
			if(speed){
				if(Math.abs(change)>=0.5){
					this.during=true;
					run();
				}else this.fixBounce(flag);
			}
			return this;
		},
		start:function(evt){
			evt=this.eventHook(evt);
			var name=evt.target.nodeName.toLowerCase();
			if(!hasTouch&&(
				name=='a'||
				name=='img'
			))evt.preventDefault();
			this.removeListener(this.element,'click',returnFalse);
			this.target=evt.target;
			this.prevPos=[evt.pageX,evt.pageY];
		},
		move:function(evt){
			if(!this.prevPos || evt.scale&&evt.scale!==1)return;
			evt=this.eventHook(evt);
			var offX,offY,
				pos=[evt.pageX,evt.pageY];
			if(this.scrolling==null){
				offX=Math.abs(pos[0]-this.prevPos[0]);
				offY=Math.abs(pos[1]-this.prevPos[1]);
				if(offX||offY){
					this.scrolling=offX<offY?'v':'h';
					this[this.scrolling+'Scroll']&&this.stop();
				}
			}
			if(this.scrolling==null||!this[this.scrolling+'Scroll'])return;
			evt.preventDefault();
			var flag=this.scrolling,temp,
				i=flag==='h'?0:1,
				offset=pos[i]-this.prevPos[i],
				timestamp=+new Date,
				range;
			if(window.getSelection!=null){
				range=getSelection();
				if(range.empty)range.empty();
				else if(range.removeAllRanges)range.removeAllRanges();
			}
			if(this.target===this[flag+'bar']){
				var total=this['total'+sg[flag][0]],
					client=this[sg[flag][0].toLowerCase()];
				offset*=(client-total)/((client-parseFloat(this.css(this.target,sg[flag][0].toLowerCase())))||1);
			}
			temp=this[flag+'Offset']+=offset;
			this.prevPos=pos;
			if(!this.prevTime || timestamp-this.prevTime>300){
				this.prevTime=timestamp;
				this.prevOffset=this[flag+'Offset'];
			}
			this.refresh(flag);
			this[flag+'Offset']=temp;
			this.during=true;
		},
		end:function(evt){
			if(this.prevPos){
				if(this.scrolling!=null&&this[this.scrolling+'Scroll']){
					this.during=false;
					this.addListener(this.element,'click',returnFalse);
					var flag=this.scrolling,time,dist;
					if(this.fixBounce(flag)===false && this.target!=this.hbar &&　this.target!=this.vbar){
						evt=this.eventHook(evt);
						time=+new Date-this.prevTime;
						dist=this[flag+'Offset']-this.prevOffset;
						if(time&&time<300&&Math.abs(dist)>20){
							this.slide(flag,this[flag+'Offset']+(3-time/300)*dist,400);
						}
					}
					this.fadeToggle();
				}
				delete this.target;
				delete this.prevPos;
				delete this.scrolling;
				delete this.prevTime;
			}
		},
		fixBounce:function(flag,speed){
			var total=this['total'+sg[flag][0]],
				client=this[sg[flag][0].toLowerCase()],
				origPos=this[flag+'Offset'],
				deftPos=-this.cfg[flag+'Offset'],
				pos;
			if(origPos>deftPos){
				pos=deftPos;
			}else if(origPos<client-total+deftPos){
				pos=client-total+deftPos;
			}else{
				return false;
			}
			speed=speed==null?200:speed;
			return this.slide(flag,pos,speed);
		},
		mouseScroll:function(evt){
			evt=this.eventHook(evt);
			var e=evt.origEvent,detailX=0,detailY;
			if('wheelDeltaX' in e){
				detailX=e.wheelDeltaX/4;
				detailY=e.wheelDeltaY/4;
			}else if('wheelDelta' in e){
				detailY=e.wheelDelta/4;
				if(Math.abs(detailY)>9999){
					detailY=Math.abs(detailY)/detailY*30;
				}
			}else if('detail' in e){
				detailY=-e.detail*9;
			}else{
				return;
			}
			evt.preventDefault();
			if(this.element && detailY!==null){
				this.scroll(-detailX,-detailY,0);
			}
		},
		keypress:function(evt){
			evt=this.eventHook(evt);
			var curKey=evt.keyCode||evt.which||evt.charCode,
				x=0,y=0;
			switch(curKey){
				case 37:x=-120;
					break;
				case 38:y=-120;
					break;
				case 39:x=120;
					break;
				case 40:y=120;
					break;
				default:return;
			}
			this.scroll(x,y,0);
		},
		destroy:function(){//销毁
			this.removeListener(this.container,startEvent,this._start,false);
			this.removeListener(document,moveEvent,this._move,false);
			this.removeListener(document,endEvent,this._end,false);
			this.removeListener(this.container,'touchcancel',this._end,false);
			this.removeListener(this.container,overEvent,this._toggleShow,false);
			this.removeListener(this.container,outEvent,this._toggleShow,false);
			if(this.cfg.mouseWheel){
				this.removeListener(this.container,'mousewheel',this._mouseScroll,false);
				this.removeListener(this.container,'DOMMouseScroll',this._mouseScroll,false);
			}
			if(this.cfg.keyPress){
				this.removeListener(document,'keydown',this._keypress,false);
			}
			this.removeListener(window,'resize',this._resize,false);
			this.removeListener(window,'orientationchange',this._resize,false);
			
			while(this.element.childNodes.length){
				this.container.appendChild(this.element.firstChild);
			}
			this.container.removeChild(this.comment);
			this.container.removeChild(this.element);
			this.container.removeChild(this.hbar);
			this.container.removeChild(this.vbar);
			this.container.scrollLeft=-this.hOffset;
			this.container.scrollTop=-this.vOffset;
			
			return this.css(this.container,{overflow:'',position:'',padding:'',visibility:''});
		}
	}
	
	each(['Width','Height'],function(i,type){
		var _type=type.toLowerCase(),
			flag=i===0?'h':'v';
		each(['margin','padding','border'],function(j,name){
			TouchScroll.fn[name+type]=function(elem){
				return (parseFloat(this.css(elem,name+'-'+sg[flag][1]+(name=='border'?'-width':'')))||0)+(parseFloat(this.css(elem,name+'-'+sg[flag][2]+(name=='border'?'-width':'')))||0);
			}
		});
		TouchScroll.fn['inner'+type]=function(elem){
			return elem['offset'+type]-this['border'+type](elem);
		}
		
		TouchScroll.fn['get'+type]=function(elem){
			return elem['offset'+type]-this['padding'+type](elem)-this['border'+type](elem);
		}
	});
	
	window.TouchScroll=TouchScroll;
})(window);