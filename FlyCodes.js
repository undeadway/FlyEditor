/**
 * FlyEditor 的主逻辑文件。
 * 对已经编码完成的输入进行解析最终输出可供显示的 HTML
 *
 * 内置了 UBB 解析和 HitOn 解析两种解析方式
 *
 * 文件解析的接口中只定义了
 * toHTML
 * clear
 */
;
this.FlyCodes = (function() {

	var newXmlWrapper = Eureka.dom.newXmlWrapper;
	var htmlEscape = Eureka.util.ReplaceHolder.htmlEscape,
		EMPTY_STRING = String.BLANK;
	var isNumber = Number.isNumber,
		formatFileSize = Eureka.util.Format.formatFileSize;

	function replacePhonics(str, regexp, startTag, endTag) {

		while(regexp.test(str)) {

			var inner = RegExp.$1;
			var input = startTag + inner + endTag;

			inner = inner.replace(/\(/g, "<rp>(</rp><rt>");
			inner = inner.replace(/\)/g, "</rt><rp>)</rp>");

			var output = '<ruby>' + inner + '</ruby>';

			str = str.replace(input, output);
		}

		return str;
	}

	function replaceURI(str) {
		// 最后的转义出处理
		try {
			str = decodeURIComponent(str);
		} catch(e) {
			// 如果出错，就当不存在
		}

		return str;
	}

	function escapseED2K(ed2kStart, ed2kEnd) {

		var ed2kIndex = 0;

		function __escapseED2K(str) {

			// 解析出 [ed2k] [/ed2k] 的结构
			var start = str.indexOf(ed2kStart);
			var end = str.indexOf(ed2kEnd);

			if(start < 0) return str; // decodeURI(str);
			if(end < 0) ed2KError();

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
						name: 'ed2k_' + ed2kIndex,
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
				name: 'ed2k_' + ed2kIndex,
				onchange: 'NameBridge.codes.ed2k.change(' + ed2kIndex + ')'
			})).add('全选/全不选').add(newXmlWrapper('input', { // TODO 相关操作未实现
				type: 'button',
				'class': 'ed2k_dl_button',
				value: '下载选中的连接',
				onclick: 'NameBridge.codes.ed2k.downloadSelected(' + ed2kIndex + ')'
			})));

			ed2kIndex++;

			str = decodeURI(str.slice(0, start)) + box.toString() + str.slice(end + 7);

			// 递归查找下一处
			return __escapseED2K(str);
		};

		return __escapseED2K;
	};

	function replacePre(preArg) {
		var source = [];
		return {
			before: function(str) {
				while(preArg.PRE_REGEXP.test(str)) {
					var inner = RegExp.$1;
					str = str.replace(preArg.PRE_START_TAG + inner + preArg.PRE_END_TAG, "{pre" + source.length + "}");
					source.push('<pre class="pre">' + inner + '</pre>');
				}

				return str;
			},
			after: function(str) {

				Object.forEach(source, function(i, src) {
					str = str.replace("{pre" + i + "}", src);
				});

				return str;
			}
		};
	}

	function defaultReplaceFace(str) {

		for(var i = 0, len = FACE_NAME.length; i < len; i++) {
			var name = FACE_NAME[i];
			var regExp = new RegExp("\\[" + name + "\\]", "g");
			if(regExp.test(str)) {
				str = str.replace(regExp, '<img src="/res/flies/face/' + (100 + i) + '.gif" title="' + name +
					'" />');
			}
		}

		return str;

	}

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

	var FACE_NAME = ['黑线', '怒', '眼泪', '炸毛', '蛋定', '微笑', '汗', '囧', '卧槽', '坏笑', '鼻血', '大姨妈', '瞪眼', '你说啥', '一脸血', '害羞',
		'大好', '喝茶看戏', '美～', '笑岔', '中箭', '呕', '撇嘴', '碎掉', '吐舌头', '纳尼', '泪流满面', '升仙', '扭曲', '闪闪亮', '山', '寨', '基',
		'惊', '头顶青天', '不错', '吃屎', '牛', '严肃', '作死', '帅' /*, '僵尸', '吸血鬼', '喵'*/ , '腹黑', '喜闻乐见', '呵呵呵', '！', '？', '吓尿了',
		'嘁', '闪电', "S1", "战斗力爆表", "贼笑", "嗯...", "喵", "奸笑"
	];

	function ed2KError() {
		throw new Error("ED2K链接的格式不正确");
	}

	function markdown() {

	}

	function hitOn() {

		var preArg = {
			PRE_REGEXP: /\[\[((.|\s)*?)\]\]/,
			PRE_START_TAG: '[[',
			PRE_END_TAG: ']]'
		};

		function replaceEscapeSequence() {
			var escapeSequences = [];
			return {
				before: function(input) {
					while(ES_REGEXP.test(input)) {
						input = input.replace(ES_REGEXP, '{backslash' + escapeSequences.length + '}');
						escapeSequences.push(RegExp.$1);
					}
					return input;
				},
				after: function(input) {
					Object.forEach(escapeSequences, function(i, obj) {
						input = input.replace(new RegExp('\\{backslash' + i + '\\}', 'g'), obj);
					});
					return input;
				}
			}
		}

		var replaceTable = (function() {

			const TABLE_REGEX = /(\|(.)+\|\n)+/,
				REP_TD = /\<td\>\n\<\/td\>/g;
			VERTICAL_BAR = /\|/g;

			const TR_JOIN = "</tr><tr>",
				TD_JOIN = "</td><td>",
				TABLE_START = '<table class="table"><tr>',
				TABLE_END = '</tr></table>';

			return function(input) {

				while((matches = input.match(TABLE_REGEX)) !== null) {
					let part = matches[0];
					let output = part.replace(VERTICAL_BAR, TD_JOIN);
					output = output.replace(REP_TD, TR_JOIN);
					output = TABLE_START + output.slice(5, output.length - 5) + TABLE_END;

					input = input.replace(part, output);
				}

				return input;
			}

		})();

		var replaceList = (function() {

			const UL_REGEX = /(\*+\. (.)+\n)+/,
				OL_1_REGEX = /([0-9]+\. (.)+\n)+/,
				OL_A_REGEX = /([a-z]+\. (.)+\n)+/,
				TYPE_1_LI_START = /[0-9]+\. /g,
				TYPE_A_LI_START = /[a-z]+\. /g,
				UL_LI_START = /\*+\. /g,
				LI_END = /\n/g;

			const LI_START_TAG = "<li>",
				LI_END_TAG = "</li>",
				UL_START_TAG = "<ul>",
				UL_END_TAG = "</ul>",
				OL_START_TYPE_1_TAG = '<ol class="list_type_1">',
				OL_START_TYPE_A_TAG = '<ol class="list_type_a">',
				OL_END_TAG = "</ol>";

			function replace(input, part, liStart, startTag, endTag) {

				var output = part.replace(liStart, LI_START_TAG);
				output = output.replace(LI_END, LI_END_TAG);

				return input.replace(part, startTag + output + endTag);
			}

			return function(input) {

				// ul
				while((matches = input.match(UL_REGEX)) !== null) {
					input = replace(input, matches[0], UL_LI_START, UL_START_TAG, UL_END_TAG);
				}
				// ol -1
				while((matches = input.match(OL_1_REGEX)) !== null) {
					input = replace(input, matches[0], TYPE_1_LI_START, OL_START_TYPE_1_TAG, OL_END_TAG);
				}
				// ol -a
				while((matches = input.match(OL_A_REGEX)) !== null) {
					input = replace(input, matches[0], TYPE_A_LI_START, OL_START_TYPE_A_TAG, OL_END_TAG);
				}

				return input;
			};
		})();

		var ES_REGEXP = /\\(.)/;
		var P_NEWLINE = /\n{2,}/,
			P_NEWLINE_G = /\n{2,}/g;

		function replaceP(input) {
			if(P_NEWLINE.test(input)) {
				input = input.replace(P_NEWLINE, "<p>");
				if(P_NEWLINE.test(input)) {
					input = input.replace(P_NEWLINE_G, "</p><p>");
				}
				input += "</p>";
			}
			input = input.replace(/\<p\>\<\/p\>/g, '');
			return input;
		}

		function replaceQuote(input) {
			while(/\n>( (.|\s)*?|)\n((.|\s)*?)(\n{2,}|$)/.test(input)) {
				var legend = RegExp.$1 || '引用';
				var txt = RegExp.$3;
				var inner = '\n>' + RegExp.$1 + '\n' + txt + RegExp.$5;
				var outs = '<fieldset class="fieldset"><legend>' + legend.trim() + '</legend>' + txt + '</fieldset>';
				input = input.replace(inner, outs);
			}
			return input;
		}

		function replaceColor(input) {
			while(/\[#([0-9,A-F]{6})\|((.|\s)*?)\]/i.test(input)) {
				var color = RegExp.$1,
					inner = RegExp.$2,
					outs;
				var splits = inner.split("|");
				if(splits.length === 2) {
					outs = '<span class="' + splits[0] + "_" + color + '">' + splits[1] + '</span>';
				} else {
					outs = '<span class="color_' + color + '">' + splits[0] + '</span>';
				}
				input = input.replace("[#" + color + "|" + inner + "]", outs);
			}
			return input;
		}

		/**
		 * #(url | txt | title | target)
		 *
		 * @param {Object} input
		 */
		function replaceLink(input) {
			while(/#\(((.|\s)*?)\)/.test(input)) {
				var inner = RegExp.$1;
				var splits = inner.split("|");
				var url = splits[0]
				var outs = '<a href="' + url + '"';
				outs += ' title="' + (splits.length === 4 ? (splits[2] || url) : url) + '"';

				var target = splits[splits.length === 4 ? 3 : 2];
				if(target) {
					outs += ' target="_' + target + '"';
				}
				outs += '>';
				outs += splits[1] || url;
				outs += '</a>';
				outs = outs.replace(/<\/?em>/g, "/");

				input = input.replace("#(" + inner + ")", outs);
			}
			return input;
		}

		/**
		 *  $(url, title, width, height)
		 *
		 * @param {Object} input
		 */
		function replaceImg(input) {
			while(/\$\(((.|\s)*?)\)/.test(input)) {
				var inner = RegExp.$1;
				var splits = inner.split("|");
				var str = splits[0].replace(/<\/?(em)>/g, "/");
				str = str.replace(/<\/?(ins)>/g, "_");
				str = str.replace(/<\/?(del)>/g, "-");
				var outs = '<img src="' + str + '"';
				outs += ' title="' + (splits[1] || str) + '"';

				if(splits[2]) {
					outs += ' width="' + splits[2] + '"';
				}

				if(splits[3]) {
					outs += ' height="' + splits[3] + '"';
				}
				outs += ' onload="styles.Image.resize(this)" onclick="styles.Image.protoSize(this)" />';

				input = input.replace("$(" + inner + ")", outs);
			}
			return input;
		}

		function replaceSimpleLineCode() {

			var lineCodes = [];

			return {
				before: function(input) {
					while(/`((.)*?)`/.test(input)) {
						input = input.replace("`" + RegExp.$1 + "`", "[lineCode" + lineCodes.length + "]");
						lineCodes.push("<code>" + RegExp.$1 + "</code>");
					}
					return input;
				},
				after: function(input) {
					Object.forEach(lineCodes, function(i, obj) {
						input = input.replace(new RegExp('\\[lineCode' + i + '\\]', 'g'), obj);
					});
					return input;
				}
			}
		}

		return {

			toHTML: function(str, plugIns) {

				if(plugIns) {
					Object.forEach(plugIns, function(i, obj) {
						str = obj.before(str);
					});
				}

				str = str.replace(/<([^\<\>]*)>/ig, '&lt;$1&gt;');

				str = this.parse(str);
				str = defaultReplaceFace(str);

				// 插件的后处理
				if(plugIns) {
					Object.forEach(plugIns, function(i, obj) {
						str = obj.after(str);
					});
				}

				// 后处理
				str = str.replace(/\<\/(p|pre)\>\n/, "</$1>");

				return replaceURI(str);
			},
			parse: function(input) {

				var es = replaceEscapeSequence(); // 转义符号
				var slc = replaceSimpleLineCode();
				input = slc.before(input);
				input = es.before(input);

				input = input.replace(/\/\*((.|\s)*?)\*\//g, ''); // 去掉注释
				input = input.replace(/\/((.|\s){1,})\//g, "<em>$1</em>"); // 斜体字
				input = replaceQuote(input); // 引用
				input = input.replace(/!((.|\s)*?)!/g, "<strong>$1</strong>"); // 粗体字
				input = input.replace(/\[\-:((.|\s)*?)\]/g, "<input type=checkbox name=$1 />"); // 未选中复选框
				input = input.replace(/\[\+:((.|\s)*?)\]/g, "<input type=checkbox checked=checked name=$1 />"); // 选中的复选框
				input = input.replace(/-((.|\s)*?)-/g, "<del>$1</del>"); // 删除线
				input = input.replace(/_((.|\s)*?)_/g, "<ins>$1</ins>"); // 下划线
				input = replaceList(input); // 列表
				input = replaceTable(input); // 表格

				input = input.replace(/\n&gt;&gt;((.|\s)+)&lt;&lt;\n/g, '<div class="align_center">$1</div>'); // 居中对齐
				input = input.replace(/\n(.+)&lt;&lt;\n/g, '<div align="align_left">$1</div>'); // 左对齐
				input = input.replace(/\n&gt;&gt;(.+)\n/g, '<div align="align_right">$1</div>'); // 右对齐

				input = replacePhonics(input, /\{\{((.|\s)*?)\}\}/, "{{", "}}"); // 注音
				input = input.replace(/\?\(([1-9]([0-9]?)):((.|\s)*?)\)/, '<span class="size_$1">$3</span>'); // 字号

				input = replaceColor(input); // 颜色
				input = replaceLink(input); // 链接
				input = replaceImg(input); // 图像

				input = input.replace(/###### (.*?)(\n|$)/g, "<h6>$1</h6>"); // 六级标题
				input = input.replace(/##### (.*?)(\n|$)/g, "<h5>$1</h5>"); // 五级标题
				input = input.replace(/#### (.*?)(\n|$)/g, "<h4>$1</h4>"); // 四级标题
				input = input.replace(/### (.*?)(\n|$)/g, "<h3>$1</h3>"); // 三级标题
				input = input.replace(/## (.*?)(\n|$)/g, "<h2>$1</h2>"); // 二级标题
				input = input.replace(/# (.*?)(\n|$)/g, "<h1>$1</h1>"); // 一级标题

				var pre = replacePre(preArg); // 预定义格式
				input = pre.before(input);

				input = replaceP(input); // 段落

				input = input.replace(/\n/g, "<br />"); // 单行换行
				input = pre.after(input);

				input = es.after(input);
				input = slc.after(input);

				return input;
			},
			clear: function(str) {
				return str;
			}
		}

	}

	function ubbcode() {

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

				while(/\[list\]((.|\s)*?)\[\/list\]/.test(str))
					str = str.replace("[list]" + RegExp.$1 + "[/list]", _replaceList(RegExp.$1));

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

		var PHONICES_REGEX = /\[phonics\]((.|\s)*?)\[\/phonics\]/,
			PHONICS_START_TAG = '[phonics]',
			PHONICS_END_TAG = '[/phonics]';

		var preArg = {
			PRE_REGEXP: /\[pre\]((.|\s)*?)\[\/pre\]/,
			PRE_START_TAG: '[pre]',
			PRE_END_TAG: '[/pre]'
		};

		var _escapseED2K = escapseED2K("[ed2k]", "[/ed2k]");

		return {
			/**
			 * 执行过程中，插件的优先级最高，
			 * 其次是各种预处理，
			 * 然后是预处理完毕之后的换行、空格等处理
			 * 最后是剩下的标签
			 *
			 * @param {Object} str
			 * @param {Object} plugIns
			 */
			toHTML: function(str, plugIns) {

				// 插件的前处理
				if(plugIns) {
					Object.forEach(plugIns, function(i, obj) {
						str = obj.before(str);
					});
				}

				var pre = replacePre(preArg);
				str = pre.before(str);
				str = htmlEscape(str);
				str = pre.after(str);

				// 插件的后处理
				if(plugIns) {
					Object.forEach(plugIns, function(i, obj) {
						str = obj.after(str);
					});
				}

				str = this.parse(str);
				str = defaultReplaceFace(str);

				return replaceURI(str);
			},
			parse: function(str) {

				// 在把 \n 替换为 <br /> 之前把包括 quote 等在内的块层级之间的换行符给去掉
				str = str.replace(
					/\[(\/)?(quote|p|table|td|tr|list|align)\]\n\[(\/)?(quote|p|table|td|tr|list|align)/,
					"[$1$2][$3$4");

				str = replaceFlash(str);

				str = str.replace(/\[\/(size|color|font|bgcolor)\]/g, '</span>');
				str = str.replace(/\[(\/)?(sub|sup|del|p|tr|td|mark)]/g, '<$1$2>');
				str = str.replace(/\[(\/)?h([1-6])]/g, '<$1h$2>');
				str = str.replace(/\[size=(\d+?)]/g, '<span class="size_$1">');
				str = str.replace(/\[(bg|)color=\#([^\[\<]+?)]/g, '<span class="$1color_$2">');

				str = replaceTable(str);

				str = str.replace(/\[align=(left|center|right|justify)\]((.|\s)*?)\[\/align\]/g, '<div class="align_$1">$2</div>');
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
				str = replacePhonics(str, PHONICES_REGEX, PHONICS_START_TAG, PHONICS_END_TAG);

				str = str.replace(/\[quote\]/g, '<fieldset class="fieldset"><legend>引用</legend><div>');
				str = str.replace(/\[quote=([^\]]+)\]/g,
					'<fieldset class="fieldset"><legend>$1</legend><div>');
				str = str.replace(/\[\/(quote|thunder|magnet)\]/g, '</div></fieldset>');

				str = str
					.replace(/\[thunder=([^\]]+)\]([^\[]+)/g,
						'<fieldset class="fieldset"><legend>迅雷资源</legend><div><a href="$1" title="$2">$2</a>');
				str = str
					.replace(/\[magnet=([^\]]+)\]([^\[]+)/g,
						'<fieldset class="fieldset"><legend>磁力链接</legend><div><a href="$1" title="$2">$2</a>');

				str = _escapseED2K(str);

				// 系统先保留这种写法
				str = str.replace(/\[b(old)?\](.+?)\[\/b(old)?]/g, '<strong>$2</strong>');
				str = str.replace(/\[i(talic)?\](.+?)\[\/i(talic)?]/g, '<em>$2</em>');

				// 这些处理是为了防止清理的不干净做的尾处理
				str = str.replace(/\<(\/)?(div|fieldset|tr|pre|table|p|h[1-6]|pre|li|ul|ol)\>\<br( \/)?\>/g, "<$1$2>"); // 去掉标签后的多余换行比如<table><br />
				str = str.replace(/\<br( \/)?\>\<(\/)?(div|fieldset|tr|table|p|h[1-6]|pre|li|ul|ol)/g, "<$2$3"); // 去掉标签后的多余换行比如<br /><table>;

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
			}
		};

	};

	return {
		UBB: ubbcode(),
		Markdown: markdown(),
		HitOn: hitOn(),
		// 因为页面上需要点击下载，所以ED2K算是一个独立的组成，这里单独给出相关方法供调用
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

})();