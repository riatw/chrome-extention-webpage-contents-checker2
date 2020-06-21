/* MEMO
	BackGround(Event) Page = 後ろで動いているページ（権限強い、DOMアクセス不可）
	ContentScripts = 指定したドメインで読み込まれる追加JS（権限弱い、DOMアクセス可）
	BrowserAction = タスクバーから実行されるポップアップ（権限普通、DOMアクセス不可）
	http://www.apps-gcp.com/calendar-extension/
*/

$(document).ready(function(){
	// AJAX実行Queue
	// var ajaxQueue = function () {
	// 	var previous = new $.Deferred().resolve();

	// 	return function (fn) {
	// 		// then()の第１と第２引数に同じ関数を渡す
	// 		return previous = previous.then(fn, fn);
	// 	};
	// }();
	var ajaxQueue = function () {
		var previous = new $.Deferred().resolve();

		return {
			put: function (fn) {
				// then()の第１引数のみ渡す
				return previous = previous.then(fn);
			},
			init: function () {
				// Deferredオブジェクトの初期化
				previous = new $.Deferred().resolve();
			}
		};
	}();

	function listMarkupCheck() {
		var errors = [];

		$("p").each(function() {
			var text = "";

			if ( $(this).text() ) {
				text = $(this).text();
			}
			if ( text.match(/^・|^※/) != null ) {
				errors.push( $(this).prop("localName") + ":" + $(this).text() );
			}
		});

		if ( errors.length == 0 ) {
			return "OK";
		}

		return errors.join("\n");
	}

	function tableStylePxCheck() {
		var errors = [];

		$("table,tr,th,td").each(function() {
			var style = "";
			if ( $(this).attr("style") ) {
				style = $(this).attr("style");
			}

			if ( style.indexOf("px") > 0 ) {
				errors.push( $(this).prop("localName") + ":" + $(this).text() );
			}
		});

		if ( errors.length == 0 ) {
			return "OK";
		}

		return errors.join("\n");
	}

	function headlineNGCharCheck($dom, pattern) {
		var errors = [];

		$dom.find("h1,h2,h3,h4,h5,h6").each(function() {
			if ( $(this).text().match( new RegExp(pattern) ) != null ) {
				errors.push( $(this).prop("localName") + ":" + $(this).text() );
			}
		});

		if ( errors.length == 0 ) {
			return "OK";
		}

		return errors.join("\n");
	}

	function headlineOrderCheck($dom) {
		var prev_order = 0;
		var current_order = 0;
		var errors = [];

		$dom.find("h1,h2,h3,h4,h5,h6").each(function() {
			current_order = $(this).prop("tagName").replace("H","");

			diff = Math.abs(current_order - prev_order);

			if ( diff > 1 ) {
				errors.push( $(this).prop("localName") + ":" + $(this).text() );
			}

			prev_order = current_order;
		});

		if ( errors.length == 0 ) {
			return "OK";
		}

		return errors.join("\n");
	}

	var app = new Vue({
		el: '#app',
		data: {
			urls: "",
			buff: {
				thead: [],
				tbody: [],
			},
			testcase: {
				case1: {
					active: false,
					ngurl: "",
				},
				case2: {
					active: false,
					ngchar: "",
					safechar: "",
				},
				case3: {
					active: false,
				},
				case4: {
					active: false,
				},
				case5: {
					active: false,
				},
				case6: {
					active: false,
				},
				case7: {
					active: false,
				},
				case8: {
					active: false,
				},
				case9: {
					active: false,
					code: "",
				},
				// case10: {
				// 	active: false,
				// },
				case11: {
					active: false,
				},
				case12: {
					active: false,
				},
				case13: {
					active: false,
					excludechar: "",
				}
			}
		},
		methods: {
			open: function() {
				var urls = this.urls.split("\n");
				var arr = [];
				var ngurl = this.testcase.case1.ngurl;
				var ngchar = this.testcase.case2.ngchar.replace(/[-\/\\^$*+?.()[\]{}]/g,'\\$&');
				var safechar = this.testcase.case2.safechar.replace(/[-\/\\^$*+?.()[\]{}]/g,'\\$&');
				var $app = this;

				ajaxQueue.init();

				function getHTML() {
					return "<!DOCTYPE html><html>" + document.head.outerHTML + "</html>";
				}

				for ( var i = 0; i < urls.length; i++ ) {
					function hoge( targetUrl, targetUrl2 ) {
						console.log("hoge");
						ajaxQueue.put(function () {
						console.log("hoge2");
							var dfd = $.Deferred();
							var currentUrl = targetUrl;
							var currentTab;

							chrome.tabs.create({ url: currentUrl }, function(tab) {
								currentTab = tab;

								chrome.tabs.onUpdated.addListener(function(tabId, info) {
									if ( info.status === 'complete' ) {
										// chrome.tabs.executeScript(tabId, { code: '(' + getHTML + ')();' }, (results) => {
										chrome.tabs.sendMessage(currentTab.id, { method: "getURL" }, function(response) {
											// var response = {};
											// response.html = results[0];
											// response.url = targetUrl;

											if ( response == null ) { return; }

											var html = response.html;
											var url = response.url;
											var origin = $("<a>").attr("href", url).get(0).origin;
											var headerBuff = [];
											var tmp = [];

											// URLをセット
											headerBuff.push("チェック対象URL");
											tmp.push({ key: "url", content: url });

											// TDKをセット
											var title = "";
											title = $(html).filter("title").text();
											headerBuff.push("title");
											tmp.push({ key: "title", content: title });

											var description = "";
											description = $(html).filter("meta[name='description']").attr("content") || '-';
											headerBuff.push("meta description");
											tmp.push({ key: "description", content: description });

											var keywords = "";
											keywords = $(html).filter("meta[name='keywords']").attr("content") || '-';
											headerBuff.push("meta keywords");
											tmp.push({ key: "keywords", content: keywords });

											// OGをセット
											var og_title = "";
											og_title = $(html).filter("meta[property='og:title']").attr("content") || '-';
											headerBuff.push("og:title");
											tmp.push({ key: "og_title", content: og_title });

											var og_site_name = "";
											og_site_name = $(html).filter("meta[property='og:site_name']").attr("content") || '-';
											headerBuff.push("og:site_name");
											tmp.push({ key: "og_site_name", content: og_site_name });

											var og_url = "";
											og_url = $(html).filter("meta[property='og:url']").attr("content") || '-';
											headerBuff.push("og:url");
											tmp.push({ key: "og_url", content: og_url });

											var og_description = "";
											og_description = $(html).filter("meta[property='og:description']").attr("content") || '-';
											headerBuff.push("og:description");
											tmp.push({ key: "og_description", content: og_description });

											var og_image = "";
											og_image = $(html).filter("meta[property='og:image']").attr("content") || '-';
											headerBuff.push("og:image");
											tmp.push({ key: "og_image", content: og_image });

											// case1: NGドメインが含まれていないか？
											if ( $app.testcase.case1.active ) {
												headerBuff.push("NGドメインが含まれていないか？");

												if ( html.indexOf(ngurl) == -1 ) {
													tmp.push({ key: "case01", content: "○" });
												}
												else {
													tmp.push({ key: "case01", content: "✕" });
												}
											}

											//case2: NG文字が含まれていないか？
											if ( $app.testcase.case2.active ) {
												headerBuff.push("NG文字が含まれていないか？");

												var c_regP = new RegExp(ngchar, "gm");
												var safeArray = safechar.split("|");

												for ( var i=0; i<safeArray.length; i++ ) {
													var safeChar = new RegExp("(" + safeArray[i] + ")", "gm");
													var escapeSafeChar = escape(safeArray[i]);

													html = html.replace(safeChar,escapeSafeChar);
												}

												if( ! html.match(c_regP) ){
													tmp.push({ key: "case02", content: "○" });
												}
												else {
													tmp.push({ key: "case02", content:"NG: 以下の文字が含まれています:" + html.match(c_regP).join(",")});
													// chrome.tabs.sendMessage(tabs[0].id, { method: "highlight", pattern: ngchar,safechar: safechar }, function(response) {});
												}
											}

											//case3: リダイレクトチェック
											if ( $app.testcase.case3.active ) {
												var redirectUrl;

												if ( targetUrl2 ) {
													redirectUrl = targetUrl2;
												}

												if ( redirectUrl ) {
													headerBuff.push("リダイレクトが正しくされているか");

													if ( response.url == redirectUrl ) {
														tmp.push({ key: "case03", content:"○"});
													}
													else {
														tmp.push({ key: "case03", content:"✕"});
													}
												}
											}

											//case4: MixedContentチェック
											if ( $app.testcase.case4.active ) {
												headerBuff.push("MixedContentが含まれていないか？");

												if ( $(html).find("[href^='http://'],[src^='http://']").not("a").not("[href^='" + origin + "'],[src^='" + origin + "']").length == 0 ) {
													tmp.push({ key: "case04", content:"○" });
												}
												else {
													tmp.push({ key: "case04", content: $(html).find("link[href^='http://'],[src^='http://']").not("a").not("[href^='" + origin + "'],[src^='" + origin + "']").prop("outerHTML") });
												}
											}

											//case5: 見出しの順番は正しいか？
											if ( $app.testcase.case5.active ) {
												headerBuff.push("見出しの順番は正しいか？");

												tmp.push({ key: "case05", content: headlineOrderCheck($(html)) });
											}

											//case6: 見出しにカッコが含まれていないか？
											if ( $app.testcase.case6.active ) {
												headerBuff.push("見出しにカッコが含まれていないか？");

												tmp.push({ key: "case06", content: headlineNGCharCheck($(html), "【|】|[|]|「|」") });
											}

											//case7: 箇条書きは「リスト」になっているか？
											if ( $app.testcase.case7.active ) {
												headerBuff.push("箇条書きは「リスト」になっているか？");

												tmp.push({ key: "case07", content: listMarkupCheck($(html)) });
											}

											//case9: テーブル幅・セル幅をpx（ピクセル）固定していないか？
											if ( $app.testcase.case8.active ) {
												headerBuff.push("テーブル幅・セル幅をpx（ピクセル）固定していないか？");

												tmp.push({ key: "case08", content: tableStylePxCheck($(html)) });
											}

											//case10: Google Analyticsがインストールされているか？
											if ( $app.testcase.case9.active && $app.testcase.case9.code ) {
												headerBuff.push("Google Analytics（Google Tag Manager）がインストールされているか？");

												// if ( html.indexOf("UA-") != -1 && ( html.indexOf("ga(") != -1 || html.indexOf("gtag") != -1 ) ) {
												// 	tmp.push({ key: "case09", content:"○" });
												// }
												// else if ( html.indexOf("analytics.js") != -1 ) {
												// 	tmp.push({ key: "case09", content:"○" });
												// }
												// else {
												// 	tmp.push({ key: "case09", content:"✕" });
												// }

												if ( html.indexOf($app.testcase.case9.code) != -1 ) {
													tmp.push({ key: "case09", content:"○" });
												}
												else {
													tmp.push({ key: "case09", content:"✕" });
												}
											}

											//case10: Google TagManagerがインストールされているか？
											// if ( $app.testcase.case10.active ) {
											// 	headerBuff.push("Google TagManagerがインストールされているか？");

											// 	if ( html.indexOf("GTM-") != -1 && html.indexOf("https://www.googletagmanager.com") != -1 ) {
											// 		tmp.push({ key: "case10", content:"○" });
											// 	}
											// 	else {
											// 		tmp.push({ key: "case10", content:"✕" });
											// 	}
											// }

											//case11: 外部リンクはすべて_blank指定があるか
											if ( $app.testcase.case11.active ) {
												var origin = $("<a>").attr("href",url).get(0).origin;
												console.log($(html).find("a[href^='htt']").not("[target='_blank']").not("[href^='" + origin + "']"));

												headerBuff.push("外部リンクはすべて_blank指定があるか");

												if ( $(html).find("a[href^='htt']").not("[target='_blank']").not("[href^='" + origin + "']").length == 0 ) {
													tmp.push({ key: "case11", content:"○" });
												}
												else {
													// TODO: 戻り値が複数項目の場合に対応したい
													tmp.push({ key: "case11", content:"✕\n" + "リンクラベル" + $(html).find("a[href^='htt']").not("[target='_blank']").not("[href^='" + origin + "']").text() });
												}
											}

											//case12: 内部リンクは「ルートパス」で入力されているか
											if ( $app.testcase.case12.active ) {
												var origin = $("<a>").attr("href",url).get(0).origin;
												console.log($(html).find("a[href^='htt']").not("[target='_blank']").not("[href^='" + origin + "']"));

												headerBuff.push("内部リンクは「ルートパス」で入力されているか");

												if ( $(html).find("a").not("[target='_blank']").not("[href^='/']").length == 0 ) {
													tmp.push({ key: "case12", content:"○" });
												}
												else {
													// TODO: 戻り値が複数項目の場合に対応したい
													tmp.push({ key: "case12", content:"✕\n" + "リンクラベル" + $(html).find("a[href^='htt']").not("[target='_blank']").not("[href^='" + origin + "']").text() });
												}
											}

											//case13: URL1とURL2の内容が一致しているか
											if ( $app.testcase.case13.active ) {
												var url1;
												var url2;
												var data1;
												var data2;

												if ( targetUrl2 ) {
													$.when(
														$.get(targetUrl),
														$.get(targetUrl2)
													)
													.done(function(data_a, data_b) {
														headerBuff.push("URL1とURL2の内容が一致しているか");

														data1 = data_a[0].replace(new RegExp($app.testcase.case13.excludechar, 'gm'), "");
														data2 = data_b[0].replace(new RegExp($app.testcase.case13.excludechar, 'gm'), "");

														if ( data1 == data2 ) {
															tmp.push({ key: "case13", content:"○" });
														}
														else {
															tmp.push({ key: "case13", content:"✕" });
														}

														dfd.resolve();
													})
													.fail(function() {
														// エラーがあった時
														console.log('case13 error');
													});
												}
											}

											// 結果を記録
											arr.push( tmp );
											$app.buff.thead = headerBuff;
											$app.buff.tbody = arr;

											// タブを閉じる
											chrome.tabs.remove(currentTab.id, function() {});

											if ( ! $app.testcase.case13.active ) {
												dfd.resolve();
											}
										});
									}
								});
							});

							return dfd.promise();
						});
					}

					hoge( urls[i].split(" ")[0], urls[i].split(" ")[1] );
				}

			},
			download: function() {
				var $app = this;
				var thead = $app.buff.thead;
				var tbody = JSON.parse(JSON.stringify($app.buff.tbody));
				var csvArr = [];

				function arrToCSV(arr) {
					return arr
					.map(row => row.map(str => '"' + (str ? str.replace(/"/g, '""') : '') + '"')
					)
					.map(row => row.join(','))
					.join('\n');
				}
				function download(data, name) {
					const anchor = document.createElement('a');

					if (window.URL && anchor.download !== undefined) {
					// utf8
					const bom = '\uFEFF';
					const blob = new Blob([bom, data], { type: 'text/csv' });
					anchor.download = name;

					// window.URL.createObjectURLを利用
					// https://developer.mozilla.org/ja/docs/Web/API/URL/createObjectURL
					anchor.href = window.URL.createObjectURL(blob);

					// これでも可
					// anchor.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(bom + data);

					// firefoxでは一度addしないと動かない
					document.body.appendChild(anchor);
					anchor.click();
					anchor.parentNode.removeChild(anchor);
					}
				}

				csvArr.push(thead);

				for ( var i = 0; i < tbody.length; i++ ) {
					var arr = [];

					for ( var j = 0; j < tbody[i].length; j++ ) {
						arr.push( tbody[i][j]["content"] );
					}

					csvArr.push(arr);
				}

				const data = arrToCSV(csvArr);
				download(data, "list.csv");
			}
		}
	});

	$(".js-storage").each(function() {
		var name = $(this).attr("name");

		if ( localStorage.getItem(name) ) {
			$(this).val( localStorage.getItem(name) );
		}
	});

	$(".js-storage").blur(function() {
		var name = $(this).attr("name");

		localStorage.setItem(name, $(this).val());
	});
});