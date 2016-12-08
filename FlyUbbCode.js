/**
 * FlyEditor 的主逻辑文件。
 * 对已经编码完成的输入进行解析最终输出可供显示的 HTML 。
 */
;
(function() {

	var newXmlWrapper = Eureka.dom.newXmlWrapper;
	var htmlEscape = Eureka.util.ReplaceHolder.htmlEscape,
		EMPTY_STRING = String.BLANK;
	var isNumber = Number.isNumber,
		formatFileSize = Eureka.util.Format.formatFileSize;

	// 从名称到代码
	var FONT_NAMES = {
		'宋体': 'song',
		'仿宋': 'fsong',
		'楷体': 'kai',
		'魏碑': 'weibei',
		'隶书': 'lishu',
		'黑体': 'hei',
		'Arial': 'arial',
		'Courier New': 'couriernew',
		'MS PGothic': 'mspgothic',
		'MS PMincho': 'mspmincho',
		'Tahoma': 'tahoma',
		'Times New Roman': 'timesnewroman'
	};

	var ed2k_index = 0;

	var FACE_NAME = ['黑线', '怒', '眼泪', '炸毛', '蛋定', '微笑', '汗', '囧', '卧槽', '坏笑', '鼻血', '大姨妈', '瞪眼', '你说啥', '一脸血', '害羞',
		'大好', '喝茶看戏', '美～', '笑岔', '中箭', '呕', '撇嘴', '碎掉', '吐舌头', '纳尼', '泪流满面', '升仙', '扭曲', '闪闪亮', '山', '寨', '基',
		'惊', '头顶青天', '不错', '吃屎', '牛', '严肃', '作死', '帅' /*, '僵尸', '吸血鬼', '喵'*/ , '腹黑', '喜闻乐见', '呵呵呵', '！', '？', '吓尿了',
		'嘁', '闪电', "S1", "战斗力爆表", "贼笑", "嗯...", "喵"
	];

	var escapseED2K = (function() {

		var ED2K_START = '[ed2k]',
			ED2K_END = '[/ed2k]';

		function ed2KError() {
			throw new Error("ED2K链接的格式不正确");
		}

		return function(str) {

			// 解析出 [ed2k] [/ed2k] 的结构
			var start = str.indexOf(ED2K_START);
			var end = str.indexOf(ED2K_END);

			if(start < 0)
				return str; // decodeURI(str);
			if(end < 0) {
				ed2KError();
			}
			var box = newXmlWrapper('fieldset', {
				"class": "fieldset ed2k_box"
			}).add(newXmlWrapper("legend").add("ED2K资源"));
			// 分割 [ed2k] [/ed2k] 中间的字符串为数组
			var title = newXmlWrapper("ul", {
				'class': 'ed2k_title'
			}).add(newXmlWrapper('li', {
				'class': 'ed2k_cb'
			}).add("选择")).add(newXmlWrapper("li", {
				'class': 'ed2k_name'
			}).add("资源名称")).add(newXmlWrapper("li", {
				'class': 'ed2k_size'
			}).add("资源大小"));
			var div = newXmlWrapper('div');
			box.add(div);
			div.add(title);
			var ed2ks = str.slice(start + 6, end).split('<br />');
			for(var i = 0, len = ed2ks.length; i < len; i++) {
				var ed2k = ed2ks[i];
				if(!ed2k.trim().isEmpty()) {
					// 以 | 为单位分割行，并判断每一行是否符合 ED2K 协议，不符合则直接显示原内容
					var ed2kElement = ed2k.split('|');
					// 符合 ED2K 协议的情况下，解析ED2K 相关部分，并显示内容到页面上
					// 关于 ED2K 协议参考：http://zh.wikipedia.org/wiki/ED2k%E9%93%BE%E6%8E%A5
					if(ed2kElement[0] !== 'ed2k://') {
						ed2KError();
					}
					var type = ed2kElement[1];
					var line = newXmlWrapper('ul', {
						'class': 'ed2k_line'
					}).add(newXmlWrapper('li', {
						'class': 'ed2k_cb'
					}).add(newXmlWrapper('input', {
						type: 'checkbox',
						name: 'ed2k_' + ed2k_index,
						value: ed2k
					})));
					switch(type) {
						case 'file':
							var name = decodeURI(ed2kElement[2]);
							var size = ed2kElement[3],
								hash = ed2kElement[4];

							if(!isNumber(size) || !isNumber(hash, Number.HEX)) {
								ed2KError();
							}

							line.putAttribute('title', name);

							var showName = newXmlWrapper('li', {
								'class': 'ed2k_name',
								title: name
							}).add(newXmlWrapper('a', {
								href: ed2k
							}).add(name));
							var showSize = newXmlWrapper('li', {
								'class': 'ed2k_size'
							});
							showSize.add(formatFileSize(size));
							line.add(showName).add(showSize);
							break;
							// 其他链接模式暂时不实现
							/* case 'server':
								break; */
						default:
							ed2KError();
					}
					div.add(line);
				}
			}

			box.add(newXmlWrapper('div', {
				'class': 'ed2k_dl_div'
			}).add(newXmlWrapper('input', {
				type: 'checkbox',
				name: 'ed2k_' + ed2k_index,
				onchange: 'FlyUbbCode.ed2k.change(' + ed2k_index + ')'
			})).add('全选/全不选').add(newXmlWrapper('input', { // TODO 相关操作未实现
				type: 'button',
				'class': 'ed2k_dl_button',
				value: '下载选中的连接',
				onclick: 'FlyUbbCode.ed2k.downloadSelected(' + ed2k_index + ')'
			})));

			ed2k_index++;

			str = decodeURI(str.slice(0, start)) + box.toString() + str.slice(end + 7);

			// 递归查找下一处
			return escapseED2K(str);
		};
	})();

	function replaceRuby(str) {

		while(/\[phonics\]((.|\s)*?)\[\/phonics\]/.test(str)) {

			var inner = RegExp.$1;
			var input = '[phonics]' + inner + '[/phonics]';

			inner = inner.replace(/[\(|（]/g, "<rp>(</rp><rt>");
			inner = inner.replace(/[\)|）]/g, "</tr><rp>)</rp>");

			var output = '<ruby>' + inner + '</ruby>';

			str = str.replace(input, output);
		}

		return str;
	}

	var replaceImg = (function() {

		/*
		 * img 标签属性，可以都不出现，或者都出现
		 * 其中 size 和 width/height 不可以同时出现，width/height 可以只出现其中之一
		 * +---------+------------------------------+
		 * |align    |(left|center|right|justify)   |
		 * +---------+------------------------------+
		 * |size     |\(width,height\)              |
		 * +---------+------------------------------+
		 * |width    |value                         |
		 * +---------+------------------------------+
		 * |height   |value                         |
		 * +---------+------------------------------+
		 */
		function _replaceImg(input, output) {

			var reg1 = /align=(left|center|right|justify)/;
			var reg2 = /(width|height)=(\d+)/;
			var reg3 = /size=\((\d+),(\d+)\)/;

			var hasSize = false,
				hasWidth_height = false;

			if(reg1.test(input)) {
				output += ' class="flyimg img_' + RegExp.$1 + '"';
			}

			if(reg2.test(input)) {
				hasSize = true;
				output += ' ' + RegExp.$1 + '="' + RegExp.$2 + '"';
			}

			if(reg3.test(input)) {
				hasWidth_height = false;
				output += ' width="' + RegExp.$1 + '" height="' + RegExp.$2 + '"';
			}

			if(hasSize && hasWidth_height) {
				throw new Error("不能同时指定 size 和 with 或 height。");
			}

			// styles.Image 模块的定义直接交给前台自定义实现，FlyEditor 相当于只给一个接口而不具体负责实现
			output += ' onload="styles.Image.resize(this)" onclick="styles.Image.protoSize(this)" />';

			return output;
		}

		return function(str) {
			/*
			 * 可能组合1：img之后为空
			 * [img align=value]src[/img]
			 * [img size=(width,height)]src[/img]
			 * [img width=value height=value]src[/img]
			 * [img width=value]src[/img]
			 * [img height=value]src[/img]
			 * [img align=value size=(width,height)]src[/img]
			 * [img align=value width=value height=value]src[/img]
			 * [img align=value width=value]src[/img]
			 * [img align=value height=value]src[/img]
			 */
			while(/\[img (align|size|width|height)=([^\[]+)\]([^\[]+)\[\/img\]/.test(str)) {

				var input = "[img " + RegExp.$1 + "=" + RegExp.$2 + "]" + RegExp.$3 + "[/img]";
				var output = '<img src="' + RegExp.$3 + '"';

				str = str.replace(input, _replaceImg(input, output));
			}

			/*
			 * 可能组合2：img之后带src
			 * [img=src align=value]title[/img]
			 * [img=src size=(width,height)]title[/img]
			 * [img=src width=value height=value]title[/img]
			 * [img=src width=value]title[/img]
			 * [img=src height=value]title[/img]
			 * [img=src align=value size=(width,height)]title[/img]
			 * [img=src align=value width=value height=value]title[/img]
			 * [img=src align=value width=value]title[/img]
			 * [img=src align=value height=value]title[/img]
			 */
			while(/\[img=([^\[]*) (align|size|width|height)=([^\[]+)\]([^\[]+)\[\/img\]/.test(str)) {

				var input = "[img=" + RegExp.$1 + " " + RegExp.$2 + "=" + RegExp.$3 + "]" + RegExp.$4 + "[/img]";
				var output = '<img src="' + RegExp.$1 + '" title="' + RegExp.$4 + '"';

				str = str.replace(input, _replaceImg(input, output));
			}

			// 不带属性的两种写法
			str = str
				.replace(
					/\[img\]([^\[]*)\[\/img\]/g, //[img]src[img]
					'<img class=\"flyimg\" title="$1" src="$1" onload="styles.Image.resize(this)" onclick="styles.Image.protoSize(this)" />');
			str = str
				.replace(
					/\[img=([^\[]*)\](.+?)\[\/img\]/g, //[img=src]title[img]
					'<img class=\"flyimg\" src="$1" title="$2" onload="styles.Image.resize(this)" onclick="styles.Image.protoSize(this)" />');

			return str;
		};
	})();

	var replaceList = function() {

		function _replaceList(inner, tag) {

			tag = tag || 'ul';

			if(inner.isEmpty()) return "";

			inner = inner.split("[*]");
			inner.shift(); // 因为 split 之后第一个 [*] 并不需要，直接 join 会多出莫名其妙的一行，所以去掉

			var output = "<" + tag + "><li>" + inner.join("</li><li>") + "</li></" + tag + ">";

			return output;

		}

		return function(str) {

			while(/\[list\]((.|\s)*?)\[\/list\]/.test(str)) {

				str = str.replace("[list]" + RegExp.$1 + "[/list]", _replaceList(RegExp.$1));
			}

			while(/\[list=(a|A|1|\*|#|o|i|I|α|一|あ|ア)( [^\[]+)*\]((.|\s)*?)\[\/list\]/.test(str)) {

				var tag,
					type = RegExp.$1,
					params = RegExp.$2,
					outParam = '',
					inner = RegExp.$3,
					className = "list_type_";

				if(!params.isEmpty()) {
					params = params.split(" ");
					if(params.length > 2) {
						throw new Error("参数个数不正确");
					}

					for(var i = 0; i < 2; i++) {
						if(params[i] === 'reversed') {
							outParam += " reversed";
						} else if(params[i].startsWith("start")) {
							outParam += ' start="' + params[i].last() + '"';
						} else {
							throw new Error("参数不正确");
						}
					}
				}

				switch(type) {
					case '#':
						className += "square";
						break;
					case '*':
						className += "disc";
						break;
					case 'o':
						className += "circle";
						break;
					case 'α':
						className += "greek";
						tag = "ol";
						break;
					case '一':
						className += "shuzi";
						tag = "ol";
						break;
					case 'あ':
						className += "hira";
						tag = "ol";
						break;
					case 'ア':
						className += "kata";
						tag = "ol";
						break;
					default:
						tag = "ol";
						className += type;
						break;
				}

				str = str.replace("[list=" + type + params + "]" + inner + "[/list]", _replaceList(inner, tag));

			}

			return str;
		};
	}();

	function replaceUrl(str) {

		str = str.replace(/\[url]((.|\s)*?)\[\/url\]/g, '<a href="$1">$1</a>'); // [url]link[url]
		str = str.replace(/\[url target=([^\[]*)\]((.|\s)*?)\[\/url\]/g, '<a href="$2" title="$2" target="_$1">$2</a>'); // [url target=value]link[/url]
		str = str.replace(/\[url=([^\[]*) target=([^\[]*)\]((.|\s)*?)\[\/url]/g, // [url=link target=value]title[/url]
			'<a href="$1" title="$3" target="_$2">$3</a>');
		str = str.replace(/\[url=([^\[]*)\]((.|\s)*?)\[\/url\]/g, '<a href="$1" title="$2">$2</a>'); // [url=link]title[url]

		return str;
	}

	function replaceFlash(str) {

		// 因为B站的加载方式很怪，有些影片就是加载不出来，所以这里单独为B站写一段代码，等待调查
		str = str
			.replace(
				/\[flash=bilibili]([^\[]+)\.swf\?([^\[]+)\[\/flash]/g,
				'<embed src="$1.swf" flashvars="$2" allowFullScreen="true" name="movie" wmode="opaque" width="634" height="440" type="application/x-shockwave-flash" />');
		// 通用表达方式，加载B站的内容Edge、Firefox、Opera都会出错（内容不定），但在 Chrome 下就不错，原因未知
		str = str
			.replace(
				/\[flash]([^\[]+)\[\/flash]/g,
				'<embed src="$1" allowFullScreen="true" name="movie" value="opaque" width="634" height="440" type="application/x-shockwave-flash" />');

		return str;
	}

	function replaceTable(str) {

		str = str.replace(/\[(tr|td) ([^\[]+)=([^\[]+)\]/g, '<$1 $2="$3">');
		str = str.replace(/\[table ([^\[]+)=([^\[]+)\]/g, '<table $1="$2" class="table">');
		str = str.replace(/\[table\]/g, '<table class="table">');
		str = str.replace(/\[\/table\]/g, '</table>');

		return str;
	}

	function replacePre() {

		var regexp = /\[pre\]((.|\s)*?)\[\/pre\]/;
		var source = [];

		return {
			before: function(str) {
				var index = 0;
				while(regexp.test(str)) {
					var inner = RegExp.$1;
					str = str.replace("[pre]" + inner + "[/pre]", "[pre-" + (index++) + "]");
					source.push("<pre>" + inner + "</pre>");
				}

				return str;
			},
			after: function(str) {

				for(var i = 0, len = source.length; i < len; i++) {
					var src = source[i];
					str = str.replace("[pre-" + i + "]", src);
				}

				return str;
			}
		};
	}

	var that = {
		toHTML: function(str, plugIns) {

			// 插件的前处理
			if(plugIns) {
				for(var i = 0, len = plugIns.length; i < len; i++) {
					str = plugIns[i].before(str);
				}
			}

			var pre = replacePre();
			str = pre.before(str);

			// 在把 \n 替换为 <br /> 之前把包括 quote pre 等在内的块层级之间的换行符给去掉
			str = str.replace(
				/\[(\/)?(quote|pre|p|table|td|tr|list|align)\]\n\[(\/)?(quote|pre|p|table|td|tr|list|align)/,
				"[$1$2][$3$4");

			str = htmlEscape(str);

			str = replaceFlash(str);

			str = str.replace(/\[\/(size|color|font|bgcolor)\]/g, '</span>');
			str = str.replace(/\[(\/)?(sub|sup|del|p|tr|td|mark)]/g, '<$1$2>');
			str = str.replace(/\[(\/)?h([1-6])]/g, '<$1h$2>');
			str = str.replace(/\[size=(\d+?)]/g, '<span class="size_$1">');
			str = str.replace(/\[color=\#([^\[\<]+?)]/g, '<span class="color_$1">');

			str = replaceTable(str);

			str = str.replace(/\[align=(left|center|right|justify)\]((.|\s)*?)\[\/align\]/g, '<div align="$1">$2</div>');
			str = str.replace(/\[bgcolor=\#([^\[\<]+?)]/g, '<span class="bgcolor_$1">');
			str = str.replace(/\[u\](.+?)\[\/u]/g, '<ins>$1</ins>');

			for(var k in FONT_NAMES) {
				var regExp = new RegExp("\\[font=" + k + "\\]", "g");
				if(regExp.test(str)) {
					str = str.replace(regExp, '<span class="font_' + FONT_NAMES[k] + '">');
				}
			}

			str = replaceList(str);
			str = replaceImg(str);
			str = replaceUrl(str);
			str = replaceRuby(str);

			str = str.replace(/\[quote\]/g, '<fieldset class="fieldset"><legend class="legend">引用</legend><div>');
			str = str.replace(/\[quote=([^\]]+)\]/g,
				'<fieldset class="fieldset"><legend class="legend">$1</legend><div>');
			str = str.replace(/\[\/(quote|thunder|magnet)\]/g, '</div></fieldset>');

			str = str
				.replace(/\[thunder=([^\]]+)\]([^\[]+)/g,
					'<fieldset class="fieldset"><legend class="legend">迅雷资源</legend><div><a href="$1" title="$2">$2</a>');
			str = str
				.replace(/\[magnet=([^\]]+)\]([^\[]+)/g,
					'<fieldset class="fieldset"><legend class="legend">磁力链接</legend><div><a href="$1" title="$2">$2</a>');

			str = escapseED2K(str);

			for(var i = 0, len = FACE_NAME.length; i < len; i++) {
				var name = FACE_NAME[i];
				var regExp = new RegExp("\\[" + name + "\\]", "g");
				if(regExp.test(str)) {
					str = str.replace(regExp, '<img src="/res/flies/face/' + (100 + i) + '.gif" title="' + name +
						'" />');
				}
			}

			// 系统先保留这种写法
			str = str.replace(/\[b(old)?\](.+?)\[\/b(old)?]/g, '<strong>$2</strong>');
			str = str.replace(/\[i(talic)?\](.+?)\[\/i(talic)?]/g, '<em>$2</em>');

			str = pre.after(str);

			// 插件的后处理
			if(plugIns) {
				for(var i = 0, len = plugIns.length; i < len; i++) {
					str = plugIns[i].after(str);
				}
			}

			// 这些处理是为了防止清理的不干净做的尾处理
			str = str.replace(/\<(\/)?(div|fieldset|tr|table|p|h[1-6]|pre|li|ul|ol)\>\<br( \/)?\>/g, "<$1$2>"); // 去掉标签后的多余换行比如<table><br />
			str = str.replace(/\<br( \/)?\>\<(\/)?(div|fieldset|tr|table|p|h[1-6]|pre|li|ul|ol)\>/g, "<$2$3>"); // 去掉标签后的多余换行比如<br /><table>;

			// 最后的转义出处理
			try {
				str = decodeURIComponent(str);
			} catch(e) {
				// 如果出错，就当不存在
			}

			return str;
		},
		clear: function(str) {
			str = str.replace(/\[\/(size|color|font|backcolor)\]/g, EMPTY_STRING);
			str = str.replace(/\[(\/)?(sub|flash|sup|underline|i|p|del|b|quote|tucao|magnet|ed2k|thunder)\]/g,
				EMPTY_STRING);
			str = str.replace(/\[\/align\]/g, EMPTY_STRING);
			str = str.replace(/\[(\/)?h([1-6])\]/g, EMPTY_STRING);
			str = str.replace(/\[align=(left|center|right|justify)\]/g, EMPTY_STRING);
			str = str.replace(/\[size=(\d+?)\]/g, EMPTY_STRING);
			str = str.replace(/\[(color|bgcolor)=\#([^\[\<]+?)\]/g, EMPTY_STRING);
			str = str.replace(/\[font=([^\[\<]+?)\]/g, EMPTY_STRING);
			str = str.replace(/\[list=(a|A|1)\](.+?)\[\/list\]/g, '$2');
			str = str.replace(/\[(\/)?list\]/g, EMPTY_STRING);
			str = str.replace(/\[img(\((left|center|right|justify)\)|)\]([^\[]*)\[\/img\]/g, '$1');
			str = str.replace(/\[url([^\[]*)\]([^\[]+)\[\/url\]/g, '$2');
			return str;
		},
		ed2k: {
			change: function(index) {
				var ed2k = document.getElementById('ed2k_' + index);
			},
			downloadSelected: function(index) {
				var ed2k = document.getElementById('ed2k_' + index);
			},
			selectAll: function() {

			}
		}
	};

	if(Eureka.side()) {
		window.FlyUbbCode = that;
	} else {
		module.exports = that;
	}

})();