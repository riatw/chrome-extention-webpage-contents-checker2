/* MEMO
	BackGround(Event) Page = 後ろで動いているページ（権限強い、DOMアクセス不可）
	ContentScripts = 指定したドメインで読み込まれる追加JS（権限弱い、DOMアクセス可）
	BrowserAction = タスクバーから実行されるポップアップ（権限普通、DOMアクセス不可）
	http://www.apps-gcp.com/calendar-extension/
*/

$(document).ready(function(){
	// AJAX実行Queue
	var ajaxQueue = function () {
		var previous = new $.Deferred().resolve();

		return function (fn) {
			// then()の第１と第２引数に同じ関数を渡す
			return previous = previous.then(fn, fn);
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
					active: true,
					ngurl: "",
				},
				case2: {
					active: true,
					ngchar: "",
					safechar: "",
				},
				case3: {
					active: true,
				},
				case4: {
					active: true,
				},
				case5: {
					active: true,
				},
				case6: {
					active: true,
				},
				case7: {
					active: true,
				},
				case8: {
					active: true,
				},
				case9: {
					active: true,
				},
				case10: {
					active: true,
				},
				case11: {
					active: true,
				},
				case12: {
					active: true,
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

				for ( var i = 0; i < urls.length; i++ ) {
					function hoge( targetUrl ) {
						ajaxQueue(function () {
							var dfd = $.Deferred();
							var currentUrl = targetUrl;
							var currentTab;

							chrome.tabs.create({ url: currentUrl }, function(tab) {
								currentTab = tab;

								chrome.tabs.onUpdated.addListener(function(tabId, info) {
									if ( info.status === 'complete' ) {
										chrome.tabs.sendMessage(currentTab.id, { method: "getURL" }, function(response) {
											if ( response == null ) { return; }

											var html = response.html;
											var url = response.url;
											var origin = $("<a>").attr("href", url).get(0).origin;
											var headerBuff = [];
											var tmp = [];

											// URLをセット
											headerBuff.push("チェック対象URL");
											tmp.push(url);

											// TDKをセット
											var title;
											title = $(html).filter("meta title").text();
											headerBuff.push("title");
											tmp.push(title);

											var description;
											description = $(html).filter("meta[name='description']").attr("content");
											headerBuff.push("meta description");
											tmp.push(description);

											var keywords;
											keywords = $(html).filter("meta[name='keywords']").attr("content");
											headerBuff.push("meta keywords");
											tmp.push(keywords);

											// OGをセット
											var og_title;
											og_title = $(html).filter("meta[property='og:title']").attr("content");
											headerBuff.push("og:title");
											tmp.push(og_title);

											var og_site_name;
											og_site_name = $(html).filter("meta[property='og:site_name']").attr("content");
											headerBuff.push("og:site_name");
											tmp.push(og_site_name);

											var og_url;
											og_url = $(html).filter("meta[property='og:url']").attr("content");
											headerBuff.push("og:url");
											tmp.push(og_url);

											var og_description;
											og_description = $(html).filter("meta[property='og:description']").attr("content");
											headerBuff.push("og:description");
											tmp.push(og_description);

											var og_image;
											og_image = $(html).filter("meta[property='og:image']").attr("content");
											headerBuff.push("og:image");
											tmp.push(og_image);

											// case1: NGドメインが含まれていないか？
											if ( $app.testcase.case1.active ) {
												headerBuff.push("NGドメインが含まれていないか？");

												if ( html.indexOf(ngurl) == -1 ) {
													tmp.push("○");
												}
												else {
													tmp.push("✕");
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
													tmp.push("○");
												}
												else {
													tmp.push("NG: 以下の文字が含まれています:" + html.match(c_regP).join(","));
													// chrome.tabs.sendMessage(tabs[0].id, { method: "highlight", pattern: ngchar,safechar: safechar }, function(response) {});
												}
											}

											//case3: リダイレクトチェック
											if ( $app.testcase.case3.active ) {
												var redirectUrl;

												if ( targetUrl.split("\t").length == 2 ) {
													currentUrl = targetUrl.split("\t")[0];
													redirectUrl = targetUrl.split("\t")[1];
												}
												if ( redirectUrl ) {
													headerBuff.push("リダイレクトが正しくされているか");

													if ( response.url == redirectUrl ) {
														tmp.push("○");
													}
													else {
														tmp.push("✕");
													}
												}
											}

											//case4: MixedContentチェック
											if ( $app.testcase.case4.active ) {
												headerBuff.push("MixedContentが含まれていないか？");

												if ( $(html).find("[href^='http'],[src^='http']").not("a").not("[href^='" + origin + "'],[src^='" + origin + "']").length == 0 ) {
													tmp.push("○");
												}
												else {
													tmp.push( $(html).find("link[href^='http'],[src^='http']").not("a").not("[href^='" + origin + "'],[src^='" + origin + "']").prop("outerHTML") );
												}
											}

											//case5: 見出しの順番は正しいか？
											if ( $app.testcase.case5.active ) {
												headerBuff.push("見出しの順番は正しいか？");

												tmp.push( headlineOrderCheck($(html)) );
											}

											//case6: 見出しにカッコが含まれていないか？
											if ( $app.testcase.case6.active ) {
												headerBuff.push("見出しにカッコが含まれていないか？");

												tmp.push( headlineNGCharCheck($(html), "【|】|[|]|「|」") );
											}

											//case7: 箇条書きは「リスト」になっているか？
											if ( $app.testcase.case7.active ) {
												headerBuff.push("箇条書きは「リスト」になっているか？");

												tmp.push( listMarkupCheck($(html)) );
											}

											//case9: テーブル幅・セル幅をpx（ピクセル）固定していないか？
											if ( $app.testcase.case8.active ) {
												headerBuff.push("テーブル幅・セル幅をpx（ピクセル）固定していないか？");

												tmp.push( tableStylePxCheck($(html)) );
											}

											//case10: Google Analyticsがインストールされているか？
											if ( $app.testcase.case9.active ) {
												headerBuff.push("Google Analyticsがインストールされているか？");

												if ( html.indexOf("UA-") != -1 && ( html.indexOf("ga(") != -1 || html.indexOf("gtag") != -1 ) ) {
													tmp.push("○");
												}
												else if ( html.indexOf("analytics.js") != -1 ) {
													tmp.push("○");
												}
												else {
													tmp.push("✕");
												}
											}

											//case10: Google TagManagerがインストールされているか？
											if ( $app.testcase.case10.active ) {
												headerBuff.push("Google TagManagerがインストールされているか？");

												if ( html.indexOf("GTM-") != -1 && html.indexOf("https://www.googletagmanager.com") != -1 ) {
													tmp.push("○");
												}
												else {
													tmp.push("✕");
												}
											}

											//case11: 外部リンクはすべて_blank指定があるか
											if ( $app.testcase.case11.active ) {
												var origin = $("<a>").attr("href",url).get(0).origin;
												console.log($(html).find("a[href^='htt']").not("[target='_blank']").not("[href^='" + origin + "']"));

												headerBuff.push("外部リンクはすべて_blank指定があるか");

												if ( $(html).find("a[href^='htt']").not("[target='_blank']").not("[href^='" + origin + "']").length == 0 ) {
													tmp.push("○");
												}
												else {
													// TODO: 戻り値が複数項目の場合に対応したい
													tmp.push("✕\n" + "リンクラベル" + $(html).find("a[href^='htt']").not("[target='_blank']").not("[href^='" + origin + "']").text() );
												}
											}

											//case11: 内部リンクは「ルートパス」で入力されているか
											if ( $app.testcase.case12.active ) {
												var origin = $("<a>").attr("href",url).get(0).origin;
												console.log($(html).find("a[href^='htt']").not("[target='_blank']").not("[href^='" + origin + "']"));

												headerBuff.push("内部リンクは「ルートパス」で入力されているか");

												if ( $(html).find("a").not("[target='_blank']").not("[href^='/']").length == 0 ) {
													tmp.push("○");
												}
												else {
													// TODO: 戻り値が複数項目の場合に対応したい
													tmp.push("✕\n" + "リンクラベル" + $(html).find("a[href^='htt']").not("[target='_blank']").not("[href^='" + origin + "']").text() );
												}
											}

											// 結果を記録
											arr.push( tmp );
											$app.buff.thead = headerBuff;
											$app.buff.tbody = arr;

											// タブを閉じる
											chrome.tabs.remove(currentTab.id, function() {});

											dfd.resolve();
										});
									}
								});
							});

							return dfd.promise();
						});
					}

					hoge( urls[i] );
				}

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