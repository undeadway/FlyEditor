/**
 * 富文本编辑器的界面和现实功能用
 * 在 textarea 中输入代码，要显示的时候，通过 FlyCodes 编译为 HTML
 * 或者只要符合输入语言语法的解析器都能解析，而不固定具体的解析器
 * 
 * 现在尚未实现所见即所得的效果
 */
var FlyEditor = (function () {

	function hideElement(id) {
		$(`#${id}`).hide();
	}

	function  showElement(id) {
		$(`#${id}`).show();
	}

	var doc = document, // document 本地变量
		//hideElement = Coralian.client.dom.hideElement, // 显示元素
		//showElement = Coralian.client.dom.showElement, // 隐藏元素
		newXmlWrapper = Coralian.dom.newXmlWrapper, // newXmlWrapper
		newWindow = Coralian.client.common.newWindow, // 打开新窗口
		decodes = FlyCodes, // HTML 变换 和 清理 函数（已结合代码高亮器）
		unsupportedOperation = Error.unsupportedOperation, // 不被支持的操作
		textArea, SUBMENU_NAMES = [],
		language = 'UBB';

	decodes.setHighLighter(FlyHighLighter.execute);

	const FACE_NAME = ['黑线', '怒', '眼泪', '炸毛', '蛋定', '微笑', '汗', '囧', '卧槽', '坏笑', '鼻血', '大姨妈', '瞪眼', '你说啥', '一脸血', '害羞',
		'大好', '喝茶看戏', '美～', '笑岔', '中箭', '呕', '撇嘴', '碎掉', '吐舌头', '纳尼', '泪流满面', '升仙', '扭曲', '闪闪亮', '山', '寨', '基',
		'惊', '头顶青天', '不错', '吃屎', '牛', '严肃', '作死', '帅' /*, '僵尸', '吸血鬼', '喵'*/, '腹黑', '喜闻乐见', '呵呵呵', '！', '？', '吓尿了',
		'嘁', '闪电', "S1", "战斗力爆表", "贼笑", "嗯...", "喵", "奸笑"
	];
	const FONT_NAMES = {
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

	decodes.addPlugIn({
		queue: [
			(input) => { // 表情
				for (var i = 0, len = FACE_NAME.length; i < len; i++) {
					var name = FACE_NAME[i];
					var regExp = new RegExp("\\[" + name + "\\]", "g");
					if (regExp.test(input)) {
						input = input.replace(regExp, '<img src="./face/' + (100 + i) + '.gif" title="' + name + '" />');
					}
				}

				return input;
			},
			(str) => { // 字体
				for (var k in FONT_NAMES) {
					var regExp = new RegExp("\\[font=" + k + "\\]", "g");
					if (regExp.test(str)) {
						str = str.replace(regExp, '<span class="font_' + FONT_NAMES[k] + '">');
					}
				}
				return str;
			}
		]
	});
	/*
	 * 因为工具栏的外观都是一致的，不一致的地方仅仅是作用到不同的 DOM 节点中
	 * 所以直接初始化工具栏，然后赋值给相关变量
	 */
	var createToolBar = (function () {

		function setColor(ul, name) {

			ul.putAttribute('class', 'color_ul');

			var COLORS = ['FF8080', 'FFFF80', '80FF80', '00FF80', '80FFFF', '0080FF', 'FF80C0', 'FF80FF', 'FF0000',
				'FFFF00', '80FF00', '00FF40', '00FFFF', '0080C0', '8080C0', 'FF00FF', '804040', 'FF8040', '00FF00',
				'008080', '004080', '8080FF', '800040', 'FF0080', '800000', 'FF8000', '008000', '008040', '0000FF',
				'0000A0', '800080', '8000FF', '400000', '804000', '004000', '004040', '000080', '000040', '400040',
				'400080', '000000', '808080', '808040', '808080', '408080', 'C0C0C0', '400040', 'FFFFFF'
			];

			for (var i = 0, len = COLORS.length; i < len; i++) {

				var color = COLORS[i];

				var li = newXmlWrapper('li', {
					title: '#' + color,
					'class': "bgcolor_" + color,
					onclick: "FlyEditor.onClick" + "('" + name + "', '" + color + "')"
				});

				ul.add(li.add("#" + color));

			}
		}

		function setSubmenu(ul, sublist) {
			for (var j = 0, sLen = sublist.length; j < sLen; j++) {

				var sName = sublist[j];
				var sObj = TOOL_BOJS[sName];
				var li = newXmlWrapper('li', {
					onclick: sObj.onclick
				});
				var div = newXmlWrapper('span', {
					id: 'tool_bar_' + sName,
					'class': 'tool_bar_bgimg tool_bar_button'
				}).add(sObj.title);
				li.add(div).add(sObj.title);
				ul.add(li);
			}
		}

		var TOOL_BOJS = {
			/*一种格式
			 * 操作：显示插入
			 */
			format: {
				title: '格式',
				onclick: "FlyEditor.submenu",
				submenu: function (ul) {

					var SUBLIST = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre'];

					for (var j = 0, sLen = SUBLIST.length; j < sLen; j++) {

						var sName = SUBLIST[j];
						var sObj = TOOL_BOJS[sName];
						var li = newXmlWrapper('li', {
							onclick: "FlyEditor.onClick('" + sName + "')"
						}).add(sObj.title);
						ul.add(li);
					}
				}
			},
			/*
			 * 没有 CSS 属性表示 工具栏中不显示图片
			 */
			p: {
				title: '段落'
			},
			pre: {
				title: '预定义'
			},
			code: {
				title: '代码',
				onclick: 'FlyEditor.code()'
			},
			// 从 H1-H6 直接解析为 HTML
			h1: {
				title: '标题1'
			},
			h2: {
				title: '标题2'
			},
			h3: {
				title: '标题3'
			},
			h4: {
				title: '标题4'
			},
			h5: {
				title: '标题5'
			},
			h6: {
				title: '标题6'
			},
			font: {
				title: '字体',
				onclick: "FlyEditor.submenu",
				submenu: function (ul) {

					for (var fontName in FONT_NAMES) {

						var fontVal = FONT_NAMES[fontName];
						ul.add(newXmlWrapper('li', {
							'class': 'font_' + fontVal,
							onclick: "FlyEditor.onClick('font','" + fontName + "')"
						}).add(fontName));
					}
				}
			},
			size: {
				title: '字号',
				onclick: "FlyEditor.submenu",
				submenu: function (ul) {

					for (var i = 0, size = 12; i < 6; i++) {
						ul.add(newXmlWrapper('li', {
							'class': 'size_' + size,
							onclick: "FlyEditor.onClick('size'," + size + ")"
						}).add(size + 'px'));
						size += 3;
					}

				}
			},
			bold: {
				title: '粗体字'
			},
			italic: {
				title: '斜体字'
			},
			underline: {
				title: '下划线'
			},
			del: {
				title: '删除线'
			},
			color: {
				title: '字体颜色',
				onclick: "FlyEditor.submenu",
				submenu: setColor
			},
			bgcolor: {
				title: '背景色',
				onclick: "FlyEditor.submenu",
				submenu: setColor
			},
			url: {
				title: '链接',
				onclick: "FlyEditor.inputPrompt('链接网址','url')"
			},
			align: {
				title: '对齐方式',
				onclick: "FlyEditor.submenu",
				submenu: function (ul) {
					setSubmenu(ul, ['alignleft', 'aligncenter', 'alignright']);
				}
			},
			alignleft: {
				title: '左对齐',
				onclick: "FlyEditor.onClick('align', 'left')"
			},

			aligncenter: {
				title: '居中对齐',
				onclick: "FlyEditor.onClick('align', 'center')"
			},
			alignright: {
				title: '右对齐',
				onclick: "FlyEditor.onClick('align', 'right')"
			},
			list: {
				title: '列表',
				onclick: "FlyEditor.submenu",
				submenu: function (ul) {
					setSubmenu(ul, ['ol', 'ul']);
				}
			},
			ol: {
				title: '有序列表',
				onclick: "FlyEditor.list('ol')"
			},
			ul: {
				title: '无序列表',
				onclick: "FlyEditor.list('ul')"
			},
			sub: {
				title: '下标'
			},
			sup: {
				title: '上标'
			},
			// 缩进（暂时不实现）
			// indent : {},
			// 表格
			table: {
				title: '表格',
				onclick: "FlyEditor.table()"
			},
			img: {
				title: '图片',
				onclick: "FlyEditor.inputPrompt2('图像网址', '图像标题','img')"
			},
			face: {
				title: '表情',
				onclick: "FlyEditor.face()"
			},
			// video : {
			// title : '视频'
			// },
			// audio : {
			// title : '音频'
			// },
			flash: {
				title: 'FLASH',
				onclick: "FlyEditor.inputPrompt('FLASH地址', 'flash')"
			},
			// cancel : {
			// title : '取消操作'},
			clear: {
				title: '清除格式',
				onclick: "FlyEditor.clear(this)"
			},
			preview: {
				title: '预览',
				onclick: "FlyEditor.preview()"
			},
			help: {
				title: '帮助',
				onclick: "FlyEditor.help()"
			},
			block: {
				title: '引用',
				onclick: "FlyEditor.block()"
			},
			thunder: {
				title: '迅雷链接',
				onclick: "FlyEditor.resource('迅雷链接', 'thunder')"
			},
			magnet: {
				title: '磁力链接',
				onclick: "FlyEditor.resource('磁力链接', 'magnet')"
			},
			ed2k: {
				title: 'ED2K',
				onclick: "FlyEditor.resource('ED2K', 'ed2k')"
			},
			escape: {
				title: '字符转义',
				onclick: "FlyEditor.escape()"
			},
			language: {
				title: '选择编译语言',
				onclick: "FlyEditor.submenu",
				submenu: function (ul) {

					ul.add(newXmlWrapper('li', {
						'id': 'lang_ubb',
						onclick: "FlyEditor.setLanguage('UBB')"
					}).add('UBB'));

					/*
					ul.add(newXmlWrapper('li', {
						'id': 'lang_ubb',
						onclick: "FlyEditor.setLanguage('Markdown')"
					}).add('Markdown'));
					*/

					ul.add(newXmlWrapper('li', {
						'id': 'lang_hiton',
						onclick: "FlyEditor.setLanguage('HitOn')"
					}).add('HitOn'));
				}
			},
			mark: {
				title: '记号'
			},
			phonics: {
				title: '注音'
			}
		};

		var TOOL_BAR_NAMES = ['format', 'font', 'size', 'bold', 'italic', 'underline', 'del', 'phonics', '|', 'color',
			'bgcolor', 'mark', 'url', 'align', 'list', 'sup', 'sub', /* 'indent', */ 'block', 'code', 'escape', '|',
			'table', 'img', 'face', '|', /* 'video', 'audio', */
			'flash', 'ed2k', 'magnet', 'thunder', '|', /* 'cancel' */
			'clear', 'preview', 'language', 'help'
		];

		return function () {

			var bar = newXmlWrapper('div', {
				id: 'tool_bar_div'
			});

			// 读取对象
			for (var i = 0, len = TOOL_BAR_NAMES.length; i < len; i++) {

				var name = TOOL_BAR_NAMES[i];
				var obj = TOOL_BOJS[name];

				var tool = newXmlWrapper('div', {
					'class': 'tool_bar_element tool_bar_bgimg'
				});
				if (name !== '|') {

					tool.putAttribute('id', 'tool_bar_' + name);

					// 显示部分
					var div = newXmlWrapper('div', {
						'class': 'tool_bar_button',
						id: 'tool_bar_button_' + name
					});
					div.putAttribute('title', obj.title);

					var onclick = obj.onclick;
					if (onclick) {
						if (onclick === "FlyEditor.submenu") {
							onclick += "('" + name + "')";
						}
					} else {
						onclick = "FlyEditor.onClick('" + name + "')";
					}
					div.putAttribute('onclick', onclick);
					tool.add(div.add(obj.title));

					// 下拉菜单
					var submenu = obj.submenu;
					if (submenu) {
						var submenuName = 'tool_bar_menu_' + name;
						SUBMENU_NAMES.push(submenuName);

						var wrap = newXmlWrapper('ul', {
							id: submenuName,
							'class': 'tool_bar_submenu'
						});
						var result = submenu(wrap, name);
						if (result) {
							wrap = result;
						}

						tool.add(wrap);
					}
				} else {
					tool.putAttribute('class', 'tool_bar_bgimg tool_bar_line');
					tool.add('分割线');
				}
				bar.add(tool);
			}

			return bar;
		};

	})();

	/*
	 * DOM 操作的预定义函数
	 */
	function hideSubMenu() {
		//		alert(SUBMENU_NAMES);
		for (var i = 0, len = SUBMENU_NAMES.length; i < len; i++) {
			hideElement(SUBMENU_NAMES[i]);
		}
	}

	function showSubMenu(idName) {
		hideSubMenu();
		showElement(idName);
	}

	function onClickInput(callback) {

		hideSubMenu();

		var start = textArea.selectionStart, // 开始位置
			end = textArea.selectionEnd, // 结束位置
			value = textArea.value; // 文本内容

		textArea.value = value.slice(0, start) +
			(('function' === typeof callback) ? callback(start, end, value) : callback) + value.slice(end);
	}

	function onClick(type, name) {

		onClickInput(function (start, end, value) {

			var replace = String.BLANK;
			switch (type) {
				case 'bold':
					replace = '[b]' + value.slice(start, end) + '[/b]';
					break;
				case 'italic':
					replace = '[i]' + value.slice(start, end) + '[/i]';
					break;
				case 'underline':
					replace = '[u]' + value.slice(start, end) + '[/u]';
					break;
				case 'color':
				case 'bgcolor':
					name = '#' + name;
				case 'font':
				case 'size':
				case 'align':
					replace = '[' + type + '=' + name + ']' + value.slice(start, end) + '[/' + type + ']';
					break;
				case 'p':
				case 'h1':
				case 'h2':
				case 'h3':
				case 'h4':
				case 'h5':
				case 'h6':
				case 'pre':
				case 'del':
				case 'sup':
				case 'sub':
				case 'mark':
				case 'phonics':
				case 'thunder':
				case 'magnet':
					replace = '[' + type + ']' + value.slice(start, end) + '[/' + type + ']';
					break;
				default:
					unsupportedOperation();
			}
			return replace;
		});
	}

	function inputPrompt(title, tag) {

		onClickInput('[' + tag + ']' + (prompt(title) || String.BLANK) + '[/' + tag + ']');
	}

	function inputPrompt2(title1, title2, tag) {

		onClickInput(function (start, end, value) {

			var url = prompt(title1) || String.BLANK;

			var title = (start === end) ? (prompt(title2) || String.BLANK) : value.slice(start, end);
			var link = '[' + tag + ((!!title) ? ('=' + url + ']' + title) : (']' + url)) + '[/' + tag + ']';

			return link;
		});
	}

	function createSubMenuDiv(parent, idName, closeCallback, onclickCallback, callback) {

		var pElement = doc.getElementById(parent);
		var submenu = doc.createElement("div");
		submenu.id = idName;
		submenu.className = 'tool_bar_submenu';
		pElement.appendChild(submenu);

		SUBMENU_NAMES.push(idName);

		var close = doc.createElement("img");
		close.src = '/res/imgs/default/closecloze.gif'; // 关闭按钮
		close.onclick = closeCallback;
		close.title = "关闭窗口";
		close.alt = "关闭按钮";
		close.className = "input_closeimg";
		submenu.appendChild(close);

		if (callback) {
			submenu.appendChild(callback());
		}

		var textarea = doc.createElement("textarea");
		textarea.className = "input_textarea";
		submenu.appendChild(textarea);

		var okButton = doc.createElement("input");
		okButton.type = "button";
		okButton.value = "确认";
		okButton.onclick = onclickCallback;

		submenu.appendChild(okButton);

		return textarea;
	}

	var insertResource = (function () {

		var areas = {},
			submenuNames = {},
			nowKey;

		function closeResource() {
			for (var name in submenuNames) {
				hideElement(submenuNames[name]);
			}
		}

		function submitResource() {
			onClickInput('[' + nowKey + ']' + areas[nowKey].value + '[/' + nowKey + ']');
		}

		return function (title, name) {

			var submenuName = "tool_bar_menu_" + name;
			if (!submenuNames[name]) {
				submenuNames[name] = submenuName;

				areas[name] = createSubMenuDiv("tool_bar_" + name, submenuName, closeResource, submitResource,
					function () {
						var div = doc.createElement("div");
						div.className = "sb_ta_title";
						div.innerHTML = "插入" + title + "链接（换行分割）";
						return div;
					});
			}
			nowKey = name;
			showSubMenu(submenuName);
		};

	})();

	var code = (function () {

		var codeArea, select, submenuName = null,
			langs = FlyHighLighter.getLangs();

		function closeCode() {
			hideElement(submenuName);
		}

		function submitCode() {

			var lang = null;
			for (var i = 1, len = select.length; i < len; i++) {
				if (select[i].selected) {
					lang = select[i].text;
					break;
				}
			}
			if (lang === null) {
				select.focus();
				alert('请选择一种语言以便为代码进行语法着色');
				return;
			}

			onClickInput('[code=' + lang + ']' + codeArea.value + '[/code]');

		}

		return function () {

			if (submenuName === null) {

				submenuName = "tool_bar_menu_code";
				codeArea = createSubMenuDiv("tool_bar_code", submenuName, closeCode, submitCode, function () {
					select = doc.createElement("select");

					var first = doc.createElement("option");
					first.value = "";
					first.text = "请选择一种语言";
					select.appendChild(first);

					for (var i = 0, len = langs.length; i < len; i++) {
						var option = doc.createElement("option");
						option.text = langs[i];
						select.appendChild(option);
					}

					return select;
				});
			}

			select[0].selected = 'selected';
			for (var i = 1, len = select.length; i < len; i++) {
				select[i].selected = '';
			}
			codeArea.value = String.BLANK;

			showSubMenu(submenuName);

		};
	})();

	var block = (function () {

		var blockArea, select, submenuName = null,
			block = ['引用', '说明', '吐槽', '模板', '自定义'];

		function closeBlock() {
			hideElement(submenuName);
		}

		function submitBlock() {
			var tag = null;
			for (var i = 1, len = select.length; i < len; i++) {
				if (select[i].selected) {
					tag = select[i].value;
					break;
				}
			}

			if (tag === null) {
				select.focus();
				alert('请选择一种引用类型');
				return;
			}

			if (tag === '自定义') {
				tag = prompt("请输入自定义标签");
			}

			onClickInput('[quote=' + tag + ']' + blockArea.value + '[/quote]');
		}

		return function (name) {

			if (submenuName === null) {

				submenuName = "tool_bar_menu_block";

				blockArea = createSubMenuDiv("tool_bar_block", submenuName, closeBlock, submitBlock, function () {

					select = doc.createElement("select");

					var first = doc.createElement("option");
					first.value = "";
					first.text = "请选择引用类型";
					select.appendChild(first);

					for (var i = 0, len = block.length; i < len; i++) {
						var option = doc.createElement("option");
						option.text = block[i];
						select.appendChild(option);
					}

					return select;
				});

			}

			select[0].selected = 'selected';
			for (var i = 1, len = select.length; i < len; i++) {
				select[i].selected = '';
			}

			blockArea.value = String.BLANK;

			showSubMenu(submenuName);

		};
	})();

	var onClickFace = (function () {

		var submenuName = null;

		function onclickFace(name) {

			return function () {

				onClickInput('[' + name + ']');
			};
		}

		return function () {

			if (submenuName === null) {

				submenuName = 'tool_bar_menu_face';
				var div = doc.createElement("div");
				div.id = submenuName;
				div.className = 'tool_bar_submenu';

				var parent = doc.getElementById("tool_bar_face");
				parent.appendChild(div);

				SUBMENU_NAMES.push(submenuName);

				for (var i = 0, len = FACE_NAME.length; i < len; i++) {
					var name = FACE_NAME[i];
					var img = doc.createElement('img');
					img.title = name;
					img.alt = name;
					img.src = '//codes.waygc.net/fly/face/' + (100 + i) + '.gif';
					img.onclick = onclickFace(name);
					div.appendChild(img);
				}
			}

			showSubMenu(submenuName);

		};
	})();

	function onClickList(type) {

		onClickInput(function (start, end, value) {

			var tag = '[list';
			if (type === 'ol') {
				tag += '=' + prompt('列表形式（大写字母、小写字母、数字）：');
			}
			tag += ']';

			var splitVal = value.slice(start, end).split('\n');

			var out = [];
			for (var i = 0, len = splitVal.length; i < len; i++) {
				out[i] = '[*]' + splitVal[i];
			}

			var str = tag + out.join('\n') + '[/list]';
			return str;
		});
	}

	function onclickTable() {
		var cow = prompt("要几行？");
		var row = prompt("要几列？");

		onClickInput(function (start, end, value) {
			var table = ["[table]\n"];
			for (var i = 0; i < row; i++) {
				table.push("[tr]");
				for (var j = 0; j < cow; j++) {
					table.push("[td] [/td]")
				}
				table.push("[/tr]\n");
			}
			table.push("[/table]");

			return table.join("");
		});
	}

	function onClickClear() {

		onClickInput(function (start, end, value) {
			return codes[language].clear(value.slice(start, end));
		});
	}

	function onClickEscape() {

		onClickInput(function (start, end, value) {

			if (start !== end) {

				return encodeURI(value.slice(start, end));
			} else {
				return String.BLANK;
			}

		});
	}

	return {
		apply: function (text, lang) {

			if (!textArea) {

				textArea = doc.createElement('textarea');
				textArea.id = 'textarea';
				textArea.name = 'textarea';
				textArea.className = 'textarea';
				textArea.value = text || '';

				textArea.onfocus = hideSubMenu;
				textArea.onblur = hideSubMenu;
			}

			SUBMENU_NAMES = [];
			var dom = doc.getElementById("content_div");
			dom.innerHTML = createToolBar();
			dom.appendChild(textArea);

			hideSubMenu();
		},
		submenu: function (name) {
			showSubMenu('tool_bar_menu_' + name);
		},
		help: function () {
			hideSubMenu();
			newWindow("//codes.waygc.net/fly/FlyEditor.helper.html");
		},
		preview: function () {
			hideSubMenu();
			try {
				var title = null;
				if (doc.forms[0]) {
					title = doc.forms[0].title.value;
				} else {
					title = "临时";
				}
				var html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8" /><link rel="stylesheet" type="text/css" href="./FlyShow.css" />' +
					'<link rel="stylesheet" type="text/css" href="./FlyHighLighter.css" /><title>' + title
					 + ' 预览</title></head><body>' + decodes.toHTML(textArea.value, language) + '</body></html>';
				var pvWindow = newWindow('FlyEditor Preview', Date.now(),
					'width=800,height=600,resizable=no,scrollbars=yes');
				pvWindow.document.write(html);
				pvWindow.focus();
			} catch (e) {
				alert('e:' + e.stack);
				alert(e.stack);
			}
		},
		onClick: onClick,
		inputPrompt: inputPrompt,
		table: onclickTable,
		inputPrompt2: inputPrompt2,
		list: onClickList,
		clear: onClickClear,
		escape: onClickEscape,
		face: onClickFace,
		code: code,
		block: block,
		resource: insertResource,
		setLanguage: function (lang) {
			hideSubMenu();
			language = lang;
		},
		getLanguage: function () {
			return language;
		}
	};
})();